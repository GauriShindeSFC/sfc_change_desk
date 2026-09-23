import { CatalogCategory, CatalogSubcategory, CatalogSubcategoryField, Workflow } from '../models/index.js';
import { addAuditLog } from './auditLog.service.js';
import { resolveEmailForUser, IdentityResolver } from './identityResolver.service.js';

const SUBCATEGORY_ORDER_MAP = {
  // 1. Server & Infra
  'subcat-srv-lc': 1,
  'subcat-srv-patch': 2,
  'subcat-srv-oth': 3,

  // 2. Network & Connectivity
  'subcat-net-fw': 1,
  'subcat-net-proxy': 2,
  'subcat-net-vpn': 3,
  'subcat-net-oth': 4,

  // 3. Access & Security
  'subcat-acc-app': 1,
  'subcat-acc-phys': 2,
  'subcat-acc-oth': 3,

  // 4. IT Asset
  'subcat-asset-dev': 1,
  'subcat-asset-hw': 2,
  'subcat-asset-sw': 3,
  'subcat-asset-lic': 4,
  'subcat-asset-oth': 5,

  // 5. Office 365 & Collaboration
  'subcat-o365-mb': 1,
  'subcat-o365-lic': 2,
  'subcat-o365-oth': 3,

  // 6. Security Tools & Policies
  'subcat-sec-ep': 1,
  'subcat-sec-oth': 2
};

const CATEGORY_ORDER_MAP = {
  'cat-asset': 1, // IT Asset
  'cat-o365': 2,  // Office 365 & Collaboration
  'cat-acc': 3,   // Access & Security
  'cat-net': 4,   // Network & Connectivity
  'cat-sec': 5,   // Security Tools & Policies
  'cat-srv': 6    // Server & Infra
};

export const getCatalogCategoriesService = async () => {
  const rows = await CatalogCategory.findAll({
    include: [
      {
        model: CatalogSubcategory,
        as: 'subcategories',
        where: { status: 'Active' },
        required: false,
        attributes: ['id', 'categoryId', 'name', 'sla', 'status']
      }
    ]
  });

  const OTHER_NAME_MAP = {
    'cat-srv': 'Other Server Changes',
    'cat-net': 'Other Network Changes',
    'cat-acc': 'Other Access Requests',
    'cat-asset': 'Other IT Asset Requests',
    'cat-o365': 'Other Email / M365 Requests',
    'cat-sec': 'Other Security Changes',
    'subcat-srv-oth': 'Other Server Changes',
    'subcat-net-oth': 'Other Network Changes',
    'subcat-acc-oth': 'Other Access Requests',
    'subcat-asset-oth': 'Other IT Asset Requests',
    'subcat-o365-oth': 'Other Email / M365 Requests',
    'subcat-sec-oth': 'Other Security Changes'
  };

  const categories = rows.map((c) => {
    const plain = c.get({ plain: true });
    if (plain.subcategories && Array.isArray(plain.subcategories)) {
      plain.subcategories.forEach((sub) => {
        delete sub.workflowId;
        delete sub.workflow;
        delete sub.risk;
        if (sub.id === 'subcat-sec-ep' || sub.name === 'End Point Agent') {
          sub.name = 'Endpoint Agent';
        }
        if ((sub.name || '').toLowerCase() === 'other' || sub.name === 'Other') {
          sub.name = OTHER_NAME_MAP[sub.id] || OTHER_NAME_MAP[sub.categoryId] || OTHER_NAME_MAP[c.id] || 'Other Request';
          sub.description = `Other ${c.name || ''} change request.`.replace('Other Other', 'Other');
        }
      });
      plain.subcategories.sort((a, b) => {
        const orderA = SUBCATEGORY_ORDER_MAP[a.id] ?? 99;
        const orderB = SUBCATEGORY_ORDER_MAP[b.id] ?? 99;
        return orderA - orderB;
      });
    }
    return plain;
  });

  categories.sort((a, b) => {
    const orderA = CATEGORY_ORDER_MAP[a.id] ?? 99;
    const orderB = CATEGORY_ORDER_MAP[b.id] ?? 99;
    return orderA - orderB;
  });

  return categories;
};

export const getCatalogSubcategoriesService = async (categoryId) => {
  const rows = await CatalogSubcategory.findAll({
    where: { categoryId, status: 'Active' },
    attributes: ['id', 'categoryId', 'name', 'sla', 'status', 'description']
  });
  const list = rows.map((s) => {
    const plain = s.get({ plain: true });
    delete plain.workflowId;
    delete plain.workflow;
    delete plain.risk;
    if (plain.id === 'subcat-sec-ep' || plain.name === 'End Point Agent') {
      plain.name = 'Endpoint Agent';
    }
    return plain;
  });
  list.sort((a, b) => {
    const orderA = SUBCATEGORY_ORDER_MAP[a.id] ?? 99;
    const orderB = SUBCATEGORY_ORDER_MAP[b.id] ?? 99;
    return orderA - orderB;
  });
  return list;
};

export const getSubcategoryFieldsService = async (subcategoryId) => {
  const rows = await CatalogSubcategoryField.findAll({
    where: { subcategoryId },
    order: [['sortOrder', 'ASC']]
  });
  return rows.map((f) => {
    const plain = f.get({ plain: true });
    let dbNeedsUpdate = false;
    if (plain.fieldLabel && (plain.fieldLabel.toLowerCase() === 'current configuration' || plain.fieldLabel.includes('Congfig') || plain.fieldLabel.includes('figuraiton') || plain.fieldLabel.toLowerCase().includes('congfig'))) {
      plain.fieldLabel = 'Current Configuration';
      dbNeedsUpdate = true;
    }
    if (plain.fieldLabel && plain.fieldLabel.includes('Proess')) {
      plain.fieldLabel = plain.fieldLabel.replace('Proess', 'Process');
      dbNeedsUpdate = true;
    }
    if (plain.options && Array.isArray(plain.options)) {
      const fixedOpts = plain.options.map(opt => (typeof opt === 'string' ? opt.replace(/Exisitng/g, 'Existing') : opt));
      if (JSON.stringify(fixedOpts) !== JSON.stringify(plain.options)) {
        plain.options = fixedOpts;
        dbNeedsUpdate = true;
      }
    }
    if (plain.appliesToActions && Array.isArray(plain.appliesToActions)) {
      const fixedActs = plain.appliesToActions.map(act => (typeof act === 'string' ? act.replace(/Exisitng/g, 'Existing') : act));
      if (JSON.stringify(fixedActs) !== JSON.stringify(plain.appliesToActions)) {
        plain.appliesToActions = fixedActs;
        dbNeedsUpdate = true;
      }
    }
    if (dbNeedsUpdate) {
      f.update({
        fieldLabel: plain.fieldLabel,
        options: plain.options,
        appliesToActions: plain.appliesToActions
      }).catch(() => {});
    }
    return plain;
  });
};

export const createCatalogSubcategoryService = async (payload = {}) => {
  const { categoryId, name, sla, risk, workflowId, description, actor } = payload;

  if (!categoryId || !name) {
    throw new Error('categoryId and name are required');
  }

  const existingCount = await CatalogSubcategory.count({ where: { categoryId } });
  const cleanCatSlug = categoryId.replace(/^cat-/, '');
  const subcatId = `subcat-${cleanCatSlug}-${existingCount + 1}`;

  let resolvedWfId = workflowId;
  if (!resolvedWfId && payload.workflow) {
    const wf = await Workflow.findOne({ where: { name: payload.workflow } });
    resolvedWfId = wf ? wf.id : 'wf-1';
  }
  if (!resolvedWfId) resolvedWfId = 'wf-1';

  const subcategory = await CatalogSubcategory.create({
    id: subcatId,
    categoryId,
    name,
    description: description || `${name} change request.`,
    sla: sla || '3 business days',
    risk: risk || 'Medium',
    workflowId: resolvedWfId,
    status: 'Active'
  });

  await CatalogSubcategoryField.bulkCreate([
    {
      id: `field-${subcatId}-action`,
      subcategoryId: subcatId,
      fieldKey: 'actionRequired',
      fieldLabel: 'Action Required',
      fieldType: 'dropdown',
      isRequired: true,
      sortOrder: 1,
      options: ['Create / Provision', 'Modify / Update', 'Decommission / Revoke', 'Other']
    },
    {
      id: `field-${subcatId}-target`,
      subcategoryId: subcatId,
      fieldKey: 'targetHostname',
      fieldLabel: 'Target Hostname / Asset',
      fieldType: 'text',
      isRequired: true,
      sortOrder: 2
    },
    {
      id: `field-${subcatId}-notes`,
      subcategoryId: subcatId,
      fieldKey: 'changeNotes',
      fieldLabel: 'Specific Notes / Details',
      fieldType: 'text',
      isRequired: false,
      sortOrder: 3
    }
  ]);

  let resolvedActorId = null;
  if (actor) {
    if (typeof actor === 'string' && (actor.startsWith('S8-') || actor.startsWith('EMP-'))) {
      resolvedActorId = actor;
    } else {
      const idRes = await IdentityResolver.resolveByEmail(actor);
      if (idRes.status === 'SUCCESS') resolvedActorId = idRes.identity.userKey;
    }
  }

  await addAuditLog({
    actorId: resolvedActorId || 'SYSTEM',
    action: 'Subcategory Created',
    ref: subcatId,
    detail: `Added new sub-category ${name} under category ${categoryId}.`
  });

  return subcategory.get({ plain: true });
};
