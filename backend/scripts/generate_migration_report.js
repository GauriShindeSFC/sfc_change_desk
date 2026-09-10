import dotenv from 'dotenv';
dotenv.config();

async function generateMigrationReport() {
  const { sequelize } = await import('../config/database.js');
  const { User } = await import('../models/index.js');
  const { UserS8 } = await import('../models/UserS8.js');
  const { Employee } = await import('../models/Employee.js');
  const { UserAppRole } = await import('../models/userAppRole.js');

  console.log('====================================================');
  console.log('  DETERMINISTIC LEGACY identity MIGRATION REPORT');
  console.log('====================================================\n');

  // Fetch all legacy dummy users
  const dummyUsers = await User.findAll({ raw: true });

  const mappingReport = [];
  const verifiedMappings = [];

  for (const dummy of dummyUsers) {
    const oldKey = dummy.id;
    const oldEmail = dummy.email ? String(dummy.email).trim().toLowerCase() : '';
    const oldRoleId = dummy.roleId;

    if (!oldEmail) {
      mappingReport.push({
        old_user_key: oldKey,
        old_email: '(NULL)',
        new_identity_type: 'NONE',
        new_source_id: 'NULL',
        new_user_key: 'UNMAPPED',
        match_method: 'none',
        status: 'UNMAPPED — DO NOT MIGRATE'
      });
      continue;
    }

    const [s8Matches, empMatches] = await Promise.all([
      UserS8.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), oldEmail),
        raw: true
      }),
      Employee.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), oldEmail),
        raw: true
      })
    ]);

    const totalCount = s8Matches.length + empMatches.length;

    if (totalCount === 0) {
      mappingReport.push({
        old_user_key: oldKey,
        old_email: oldEmail,
        new_identity_type: 'NONE',
        new_source_id: 'NULL',
        new_user_key: 'UNMAPPED',
        match_method: 'exact email lookup',
        status: 'UNMAPPED — DO NOT MIGRATE'
      });
    } else if (totalCount > 1) {
      mappingReport.push({
        old_user_key: oldKey,
        old_email: oldEmail,
        new_identity_type: 'MULTIPLE',
        new_source_id: 'MULTIPLE',
        new_user_key: 'AMBIGUOUS',
        match_method: 'exact email lookup',
        status: 'AMBIGUOUS — DO NOT MIGRATE'
      });
    } else {
      // Exactly 1 match
      let newType, newId, newKey, targetRole;

      if (s8Matches.length === 1) {
        newType = 'S8_USER';
        newId = s8Matches[0].id;
        newKey = `S8-${newId}`;
        // Preserve legacy role if valid for S8
        targetRole = (oldRoleId === 'role-1' || oldRoleId === 'role-2') ? oldRoleId : 'role-2';
      } else {
        newType = 'EMPLOYEE';
        newId = empMatches[0].id;
        newKey = `EMP-${newId}`;
        // Preserve legacy role if valid for Employee
        targetRole = (oldRoleId === 'role-3' || oldRoleId === 'role-4') ? oldRoleId : 'role-4';
      }

      mappingReport.push({
        old_user_key: oldKey,
        old_email: oldEmail,
        new_identity_type: newType,
        new_source_id: newId,
        new_user_key: newKey,
        assigned_role_id: targetRole,
        match_method: 'exact email match',
        status: 'VERIFIED'
      });

      verifiedMappings.push({
        oldKey,
        newKey,
        targetRole,
        newType,
        newId,
        email: oldEmail
      });
    }
  }

  console.table(mappingReport);

  console.log('\n--- VERIFIED MAPPINGS SUMMARY ---');
  console.log(`Total dummy accounts: ${dummyUsers.length}`);
  console.log(`Verified mappings: ${verifiedMappings.length}`);
  console.log(`Unmapped / Ambiguous: ${dummyUsers.length - verifiedMappings.length}`);

  return { mappingReport, verifiedMappings };
}

generateMigrationReport().then(() => process.exit(0)).catch((err) => {
  console.error('Error generating migration report:', err);
  process.exit(1);
});
