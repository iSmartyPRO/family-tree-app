'use strict';

const { v4: uuidv4 } = require('uuid');
const { importFromGedcom } = require('../utils/gedcom');

/**
 * Isolated unit tests for tree logic (no DB / Express required).
 * These test the pure logic used in routes/trees.js helper functions,
 * publicLink generation, and GEDCOM import.
 */

// ─── Helpers replicated from routes/trees.js for testability ────────────────

function hasReadAccess(tree, userId) {
  const ownerId = tree.owner._id ? tree.owner._id.toString() : tree.owner.toString();
  if (ownerId === userId) return true;
  return tree.members.some((m) => m.user.toString() === userId);
}

function hasWriteAccess(tree, userId) {
  const ownerId = tree.owner._id ? tree.owner._id.toString() : tree.owner.toString();
  if (ownerId === userId) return true;
  return tree.members.some((m) => m.user.toString() === userId && m.role === 'editor');
}

function isOwner(tree, userId) {
  const ownerId = tree.owner._id ? tree.owner._id.toString() : tree.owner.toString();
  return ownerId === userId;
}

function addMember(tree, userId, role) {
  const existingIdx = tree.members.findIndex((m) => m.user.toString() === userId);
  if (existingIdx >= 0) {
    tree.members[existingIdx].role = role;
  } else {
    tree.members.push({ user: userId, role, addedAt: new Date() });
  }
  return tree;
}

function removeMember(tree, userId) {
  const before = tree.members.length;
  tree.members = tree.members.filter((m) => m.user.toString() !== userId);
  return tree.members.length < before;
}

function generatePublicLink(password, ttlDays) {
  const token = uuidv4();
  let expiresAt = null;
  if (ttlDays && Number(ttlDays) > 0) {
    expiresAt = new Date(Date.now() + Number(ttlDays) * 24 * 60 * 60 * 1000);
  }
  return { token, password: password || null, expiresAt, active: true };
}

// ─── Test data ───────────────────────────────────────────────────────────────

const OWNER_ID = 'user-owner-001';
const EDITOR_ID = 'user-editor-002';
const VIEWER_ID = 'user-viewer-003';
const STRANGER_ID = 'user-stranger-004';

function makeTree(overrides = {}) {
  return {
    owner: OWNER_ID,
    members: [],
    nodes: [],
    relations: [],
    publicLink: null,
    ...overrides,
  };
}

// ─── Share route: adding members ─────────────────────────────────────────────

describe('Tree sharing – addMember', () => {
  test('adds a viewer member to an empty members list', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    expect(tree.members.length).toBe(1);
    expect(tree.members[0].user).toBe(VIEWER_ID);
    expect(tree.members[0].role).toBe('viewer');
  });

  test('adds an editor member', () => {
    const tree = makeTree();
    addMember(tree, EDITOR_ID, 'editor');
    expect(tree.members[0].role).toBe('editor');
  });

  test('updates role when same user is added again', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    addMember(tree, VIEWER_ID, 'editor');
    expect(tree.members.length).toBe(1);
    expect(tree.members[0].role).toBe('editor');
  });

  test('can add multiple different users', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    addMember(tree, EDITOR_ID, 'editor');
    expect(tree.members.length).toBe(2);
  });

  test('addedAt is a Date', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    expect(tree.members[0].addedAt).toBeInstanceOf(Date);
  });
});

// ─── Share route: removing members ───────────────────────────────────────────

describe('Tree sharing – removeMember', () => {
  test('removes an existing member and returns true', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    const removed = removeMember(tree, VIEWER_ID);
    expect(removed).toBe(true);
    expect(tree.members.length).toBe(0);
  });

  test('returns false when member not found', () => {
    const tree = makeTree();
    const removed = removeMember(tree, STRANGER_ID);
    expect(removed).toBe(false);
  });

  test('only removes the targeted member', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    addMember(tree, EDITOR_ID, 'editor');
    removeMember(tree, VIEWER_ID);
    expect(tree.members.length).toBe(1);
    expect(tree.members[0].user).toBe(EDITOR_ID);
  });
});

// ─── Access control helpers ───────────────────────────────────────────────────

describe('Access control – hasReadAccess', () => {
  test('owner has read access', () => {
    const tree = makeTree();
    expect(hasReadAccess(tree, OWNER_ID)).toBe(true);
  });

  test('viewer member has read access', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    expect(hasReadAccess(tree, VIEWER_ID)).toBe(true);
  });

  test('editor member has read access', () => {
    const tree = makeTree();
    addMember(tree, EDITOR_ID, 'editor');
    expect(hasReadAccess(tree, EDITOR_ID)).toBe(true);
  });

  test('stranger has no read access', () => {
    const tree = makeTree();
    expect(hasReadAccess(tree, STRANGER_ID)).toBe(false);
  });
});

describe('Access control – hasWriteAccess', () => {
  test('owner has write access', () => {
    const tree = makeTree();
    expect(hasWriteAccess(tree, OWNER_ID)).toBe(true);
  });

  test('editor member has write access', () => {
    const tree = makeTree();
    addMember(tree, EDITOR_ID, 'editor');
    expect(hasWriteAccess(tree, EDITOR_ID)).toBe(true);
  });

  test('viewer member does NOT have write access', () => {
    const tree = makeTree();
    addMember(tree, VIEWER_ID, 'viewer');
    expect(hasWriteAccess(tree, VIEWER_ID)).toBe(false);
  });

  test('stranger has no write access', () => {
    const tree = makeTree();
    expect(hasWriteAccess(tree, STRANGER_ID)).toBe(false);
  });
});

describe('Access control – isOwner', () => {
  test('returns true for owner', () => {
    const tree = makeTree();
    expect(isOwner(tree, OWNER_ID)).toBe(true);
  });

  test('returns false for member', () => {
    const tree = makeTree();
    addMember(tree, EDITOR_ID, 'editor');
    expect(isOwner(tree, EDITOR_ID)).toBe(false);
  });

  test('supports object owner with _id', () => {
    const tree = makeTree({ owner: { _id: OWNER_ID } });
    expect(isOwner(tree, OWNER_ID)).toBe(true);
  });
});

// ─── Public link generation ───────────────────────────────────────────────────

describe('Public link – generatePublicLink', () => {
  test('generates a valid UUID token', () => {
    const link = generatePublicLink(null, null);
    expect(link.token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('link is active by default', () => {
    const link = generatePublicLink(null, null);
    expect(link.active).toBe(true);
  });

  test('expiresAt is null when no ttlDays', () => {
    const link = generatePublicLink(null, 0);
    expect(link.expiresAt).toBeNull();
  });

  test('expiresAt is set when ttlDays > 0', () => {
    const before = Date.now();
    const link = generatePublicLink(null, 7);
    const expectedMs = 7 * 24 * 60 * 60 * 1000;
    expect(link.expiresAt).toBeInstanceOf(Date);
    expect(link.expiresAt.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 1000);
    expect(link.expiresAt.getTime()).toBeLessThanOrEqual(before + expectedMs + 1000);
  });

  test('each call generates a unique token', () => {
    const a = generatePublicLink(null, null);
    const b = generatePublicLink(null, null);
    expect(a.token).not.toBe(b.token);
  });

  test('password is stored as provided (hashing done separately)', () => {
    const link = generatePublicLink('mySecret', null);
    expect(link.password).toBe('mySecret');
  });

  test('password is null when not provided', () => {
    const link = generatePublicLink(null, null);
    expect(link.password).toBeNull();
  });
});

// ─── GEDCOM import from real-ish sample ──────────────────────────────────────

const realGedcomSample = `0 HEAD
1 SOUR FamilySearch
2 VERS 6.0
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I001@ INDI
1 NAME George /Washington/
2 GIVN George
2 SURN Washington
1 SEX M
1 BIRT
2 DATE 22 FEB 1732
2 PLAC Pope's Creek, Virginia
1 DEAT
2 DATE 14 DEC 1799
2 PLAC Mount Vernon, Virginia
1 NOTE First President of the United States
0 @I002@ INDI
1 NAME Martha /Custis/
2 GIVN Martha
2 SURN Washington
2 _MARN Custis
1 SEX F
1 BIRT
2 DATE 2 JUN 1731
2 PLAC New Kent County, Virginia
1 DEAT
2 DATE 22 MAY 1802
0 @I003@ INDI
1 NAME John Parke /Custis/
2 GIVN John Parke
2 SURN Custis
1 SEX M
1 BIRT
2 DATE 1754
0 @F001@ FAM
1 HUSB @I001@
1 WIFE @I002@
1 CHIL @I003@
0 TRLR`;

describe('GEDCOM import – real sample (Washington family)', () => {
  let result;

  beforeAll(() => {
    result = importFromGedcom(realGedcomSample);
  });

  test('imports 3 people', () => {
    expect(result.nodes.length).toBe(3);
  });

  test('imports George Washington correctly', () => {
    const george = result.nodes.find((n) => n.firstName === 'George');
    expect(george).toBeDefined();
    expect(george.lastName).toBe('Washington');
    expect(george.gender).toBe('male');
    expect(george.birthDate).toBe('1732-02-22');
    expect(george.birthPlace).toBe("Pope's Creek, Virginia");
    expect(george.deathDate).toBe('1799-12-14');
    expect(george.deathPlace).toBe('Mount Vernon, Virginia');
    expect(george.bio).toBe('First President of the United States');
  });

  test('imports Martha with maiden name', () => {
    const martha = result.nodes.find((n) => n.firstName === 'Martha');
    expect(martha).toBeDefined();
    expect(martha.gender).toBe('female');
    expect(martha.maidenName).toBe('Custis');
    expect(martha.birthDate).toBe('1731-06-02');
    expect(martha.deathDate).toBe('1802-05-22');
  });

  test('imports John Parke Custis with year-only birth date', () => {
    const john = result.nodes.find((n) => n.firstName === 'John Parke');
    expect(john).toBeDefined();
    expect(john.birthDate).toBe('1754-01-01');
  });

  test('creates spouse relation', () => {
    const george = result.nodes.find((n) => n.firstName === 'George');
    const martha = result.nodes.find((n) => n.firstName === 'Martha');
    const spouse = result.relations.find(
      (r) =>
        r.type === 'spouse' &&
        ((r.from === george.id && r.to === martha.id) || (r.from === martha.id && r.to === george.id))
    );
    expect(spouse).toBeDefined();
  });

  test('creates 2 parent-child relations for John Parke (one per parent)', () => {
    const john = result.nodes.find((n) => n.firstName === 'John Parke');
    const parentRels = result.relations.filter(
      (r) => r.type === 'parent-child' && r.to === john.id
    );
    expect(parentRels.length).toBe(2);
  });

  test('total relations count is correct', () => {
    // 1 spouse + 2 parent-child
    expect(result.relations.length).toBe(3);
  });
});
