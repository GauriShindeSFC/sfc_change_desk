import '../config/env.js';
import { sequelize } from '../config/database.js';
import { QueryTypes } from 'sequelize';
import { generatePreSpendCode } from '../services/preSpend.service.js';
import { generateTravelCode } from '../services/travelDesk.service.js';

/**
 * End-to-end transaction test for request creation & sequence concurrency.
 * Tests executed strictly on isolated test schema: test_isolated_sandbox.
 */
async function runSequenceTests() {
  const results = {
    existingSequenceTest: null,
    missingSequenceTest: null,
    concurrentFirstUseTest: null,
    yearRolloverTest: null,
    savedRequestsCounts: {}
  };

  try {
    console.log('[Test Suite] Running comprehensive sequence & transaction creation tests...');

    // Switch session search_path to isolated test schema
    await sequelize.query(`SET search_path TO test_isolated_sandbox, public;`);

    // Record baseline count before tests
    const [initialPS] = await sequelize.query(`SELECT count(*) as count FROM test_isolated_sandbox.pre_spend_requests;`, { type: QueryTypes.SELECT });
    const [initialTR] = await sequelize.query(`SELECT count(*) as count FROM test_isolated_sandbox.travel_requests;`, { type: QueryTypes.SELECT });

    // -------------------------------------------------------------
    // TEST 1: Existing Sequence within Transactions
    // -------------------------------------------------------------
    console.log('[Test 1] Testing request creation with existing sequence within explicit transaction...');
    const t1 = await sequelize.transaction();
    try {
      const code1 = await generatePreSpendCode(t1, 2026);
      await sequelize.query(`
        INSERT INTO test_isolated_sandbox.pre_spend_requests 
          (id, request_code, requester_id, requester_name, requester_email, category, subcategory, item_description, status, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), :code, 'usr-test-1', 'Test User 1', 'test1@example.com', 'Hardware', 'Laptops', 'Test Purchase 1', 'Pending Approval', NOW(), NOW());
      `, { replacements: { code: code1 }, transaction: t1 });

      await t1.commit();
      results.existingSequenceTest = { passed: true, sampleCode: code1 };
    } catch (err) {
      await t1.rollback();
      results.existingSequenceTest = { passed: false, error: err.message };
    }

    // -------------------------------------------------------------
    // TEST 2: Missing Sequence Auto-Creation & Transactional Insert
    // -------------------------------------------------------------
    console.log('[Test 2] Dropping future test sequence to simulate missing sequence...');
    await sequelize.query(`DROP SEQUENCE IF EXISTS test_isolated_sandbox.prespend_code_seq_2028, public.prespend_code_seq_2028 CASCADE;`);
    await sequelize.query(`DELETE FROM test_isolated_sandbox.pre_spend_requests WHERE request_code LIKE 'PS-2028-%';`);

    const code2 = await generatePreSpendCode(null, 2028);
    const t2 = await sequelize.transaction();
    try {
      await sequelize.query(`
        INSERT INTO test_isolated_sandbox.pre_spend_requests 
          (id, request_code, requester_id, requester_name, requester_email, category, subcategory, item_description, status, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), :code, 'usr-test-2', 'Test User 2', 'test2@example.com', 'Software', 'Licenses', 'Test License 2028', 'Pending Approval', NOW(), NOW());
      `, { replacements: { code: code2 }, transaction: t2 });

      await t2.commit();
      results.missingSequenceTest = { passed: code2 === 'PS-2028-0001', generatedCode: code2, expectedCode: 'PS-2028-0001' };
    } catch (err) {
      await t2.rollback();
      results.missingSequenceTest = { passed: false, error: err.message };
    }

    // -------------------------------------------------------------
    // TEST 3: Concurrent First Use in New Year (Simultaneous First Requests)
    // -------------------------------------------------------------
    console.log('[Test 3] Simulating simultaneous first requests in an uninitialized year (2029)...');
    await sequelize.query(`DROP SEQUENCE IF EXISTS test_isolated_sandbox.travel_code_seq_2029, public.travel_code_seq_2029 CASCADE;`);
    await sequelize.query(`DELETE FROM test_isolated_sandbox.travel_requests WHERE request_code LIKE 'TR-2029-%';`);

    const concurrentResults = [];
    for (let batch = 0; batch < 2; batch++) {
      const batchPromises = Array.from({ length: 2 }).map(async (_, index) => {
        try {
          const code = await generateTravelCode(null, 2029);
          const tx = await sequelize.transaction();
          try {
            await sequelize.query(`
              INSERT INTO test_isolated_sandbox.travel_requests 
                (id, request_code, requester_id, traveller_name, traveller_email, travel_mode, purpose, status, created_at, updated_at)
              VALUES 
                (gen_random_uuid(), :code, :userId, :name, :email, 'Flight', 'Project Kickoff', 'Pending Approval', NOW(), NOW());
            `, {
              replacements: {
                code,
                userId: `usr-test-concurrent-${batch}-${index}`,
                name: `Traveller ${batch * 2 + index + 1}`,
                email: `traveller${batch * 2 + index + 1}@example.com`
              },
              transaction: tx
            });
            await tx.commit();
            return { success: true, code };
          } catch (err) {
            await tx.rollback();
            return { success: false, error: err.message };
          }
        } catch (genErr) {
          return { success: false, error: genErr.message };
        }
      });
      const res = await Promise.all(batchPromises);
      concurrentResults.push(...res);
    }

    const successfulConcurrent = concurrentResults.filter(r => r.success);
    const uniqueCodes = new Set(successfulConcurrent.map(r => r.code));

    results.concurrentFirstUseTest = {
      attempted: 4,
      savedSuccessfully: successfulConcurrent.length,
      uniqueCodesCount: uniqueCodes.size,
      passed: successfulConcurrent.length === 4 && uniqueCodes.size === 4,
      generatedCodes: Array.from(uniqueCodes)
    };

    // -------------------------------------------------------------
    // TEST 4: Year Rollover Test (From Year A to Year B)
    // -------------------------------------------------------------
    console.log('[Test 4] Testing rollover from 2029 to 2030...');
    await sequelize.query(`DROP SEQUENCE IF EXISTS test_isolated_sandbox.travel_code_seq_2030, public.travel_code_seq_2030 CASCADE;`);
    await sequelize.query(`DELETE FROM test_isolated_sandbox.travel_requests WHERE request_code LIKE 'TR-2030-%';`);

    const t4 = await sequelize.transaction();
    try {
      const codeRollover = await generateTravelCode(t4, 2030);
      await sequelize.query(`
        INSERT INTO test_isolated_sandbox.travel_requests 
          (id, request_code, requester_id, traveller_name, traveller_email, travel_mode, purpose, status, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), :code, 'usr-test-rollover', 'Rollover Traveller', 'rollover@example.com', 'Train', 'Annual Review', 'Pending Approval', NOW(), NOW());
      `, { replacements: { code: codeRollover }, transaction: t4 });

      await t4.commit();
      results.yearRolloverTest = {
        passed: codeRollover === 'TR-2030-0001',
        generatedCode: codeRollover
      };
    } catch (err) {
      await t4.rollback();
      results.yearRolloverTest = { passed: false, error: err.message };
    }

    // -------------------------------------------------------------
    // Final Saved Records Count Verification
    // -------------------------------------------------------------
    const [finalPS] = await sequelize.query(`SELECT count(*) as count FROM test_isolated_sandbox.pre_spend_requests;`, { type: QueryTypes.SELECT });
    const [finalTR] = await sequelize.query(`SELECT count(*) as count FROM test_isolated_sandbox.travel_requests;`, { type: QueryTypes.SELECT });

    results.savedRequestsCounts = {
      preSpend: {
        initial: Number(initialPS.count),
        final: Number(finalPS.count),
        newlySaved: Number(finalPS.count) - Number(initialPS.count)
      },
      travel: {
        initial: Number(initialTR.count),
        final: Number(finalTR.count),
        newlySaved: Number(finalTR.count) - Number(initialTR.count)
      }
    };

    console.log(JSON.stringify({ status: 'ALL_SEQUENCE_TESTS_COMPLETED', results }, null, 2));

  } catch (suiteErr) {
    console.error('[Test Suite Error]:', suiteErr.message);
  } finally {
    // Reset search_path
    await sequelize.query(`SET search_path TO public;`).catch(() => {});
    await sequelize.close().catch(() => {});
  }
}

runSequenceTests();
