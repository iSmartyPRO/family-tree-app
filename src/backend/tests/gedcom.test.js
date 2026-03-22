'use strict';

const { exportToGedcom, importFromGedcom } = require('../utils/gedcom');

// Sample tree data for tests
const sampleTree = {
  name: 'Test Family',
  nodes: [
    {
      id: 'node-1',
      firstName: 'John',
      lastName: 'Smith',
      maidenName: '',
      gender: 'male',
      birthDate: '1950-06-15',
      birthPlace: 'New York, NY',
      deathDate: null,
      deathPlace: '',
      photo: '',
      bio: 'Patriarch of the Smith family.',
      x: 0,
      y: 0,
    },
    {
      id: 'node-2',
      firstName: 'Mary',
      lastName: 'Smith',
      maidenName: 'Johnson',
      gender: 'female',
      birthDate: '1953-03-22',
      birthPlace: 'Boston, MA',
      deathDate: '2020-11-01',
      deathPlace: 'New York, NY',
      photo: '',
      bio: '',
      x: 200,
      y: 0,
    },
    {
      id: 'node-3',
      firstName: 'Alice',
      lastName: 'Smith',
      maidenName: '',
      gender: 'female',
      birthDate: '1978-09-10',
      birthPlace: '',
      deathDate: null,
      deathPlace: '',
      photo: '',
      bio: '',
      x: 100,
      y: 200,
    },
  ],
  relations: [
    { id: 'rel-1', from: 'node-1', to: 'node-2', type: 'spouse' },
    { id: 'rel-2', from: 'node-1', to: 'node-3', type: 'parent-child' },
    { id: 'rel-3', from: 'node-2', to: 'node-3', type: 'parent-child' },
  ],
};

const sampleGedcom = `0 HEAD
1 SOUR TestApp
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Robert /Brown/
2 GIVN Robert
2 SURN Brown
1 SEX M
1 BIRT
2 DATE 15 APR 1940
2 PLAC London, England
1 DEAT
2 DATE 3 JAN 2010
2 PLAC Manchester, England
0 @I2@ INDI
1 NAME Susan /Brown/
2 GIVN Susan
2 SURN Brown
1 SEX F
1 BIRT
2 DATE 20 JUN 1945
0 @I3@ INDI
1 NAME Tom /Brown/
2 GIVN Tom
2 SURN Brown
1 SEX M
1 BIRT
2 DATE 5 MAY 1970
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR`;

describe('gedcom.js – exportToGedcom', () => {
  let gedcomOutput;

  beforeAll(() => {
    gedcomOutput = exportToGedcom(sampleTree);
  });

  test('produces a non-empty string', () => {
    expect(typeof gedcomOutput).toBe('string');
    expect(gedcomOutput.length).toBeGreaterThan(0);
  });

  test('starts with HEAD record', () => {
    expect(gedcomOutput).toMatch(/^0 HEAD/);
  });

  test('ends with TRLR record', () => {
    expect(gedcomOutput.trim()).toMatch(/0 TRLR$/);
  });

  test('contains INDI records for each node', () => {
    const indiMatches = gedcomOutput.match(/^0 @I\d+@ INDI$/gm);
    expect(indiMatches).not.toBeNull();
    expect(indiMatches.length).toBe(sampleTree.nodes.length);
  });

  test('contains NAME lines for each person', () => {
    expect(gedcomOutput).toContain('John /Smith/');
    expect(gedcomOutput).toContain('Mary /Smith/');
    expect(gedcomOutput).toContain('Alice /Smith/');
  });

  test('contains SEX records', () => {
    expect(gedcomOutput).toContain('1 SEX M');
    expect(gedcomOutput).toContain('1 SEX F');
  });

  test('contains BIRT event with date and place', () => {
    expect(gedcomOutput).toContain('1 BIRT');
    expect(gedcomOutput).toContain('2 DATE 15 JUN 1950');
    expect(gedcomOutput).toContain('2 PLAC New York, NY');
  });

  test('contains DEAT event for Mary', () => {
    expect(gedcomOutput).toContain('1 DEAT');
    expect(gedcomOutput).toContain('2 DATE 1 NOV 2020');
  });

  test('contains FAM records for spouse/parent-child relations', () => {
    const famMatches = gedcomOutput.match(/^0 @F\d+@ FAM$/gm);
    expect(famMatches).not.toBeNull();
    expect(famMatches.length).toBeGreaterThanOrEqual(1);
  });

  test('contains maiden name', () => {
    expect(gedcomOutput).toContain('2 _MARN Johnson');
  });

  test('contains bio as NOTE', () => {
    expect(gedcomOutput).toContain('1 NOTE Patriarch of the Smith family.');
  });

  test('contains HUSB and WIFE in FAM', () => {
    expect(gedcomOutput).toContain('1 HUSB');
    expect(gedcomOutput).toContain('1 WIFE');
    expect(gedcomOutput).toContain('1 CHIL');
  });
});

describe('gedcom.js – importFromGedcom', () => {
  let result;

  beforeAll(() => {
    result = importFromGedcom(sampleGedcom);
  });

  test('returns nodes and relations arrays', () => {
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(Array.isArray(result.relations)).toBe(true);
  });

  test('imports correct number of nodes', () => {
    expect(result.nodes.length).toBe(3);
  });

  test('nodes have required fields', () => {
    for (const node of result.nodes) {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('firstName');
      expect(node).toHaveProperty('lastName');
      expect(node).toHaveProperty('gender');
    }
  });

  test('parses Robert Brown correctly', () => {
    const robert = result.nodes.find((n) => n.firstName === 'Robert');
    expect(robert).toBeDefined();
    expect(robert.lastName).toBe('Brown');
    expect(robert.gender).toBe('male');
    expect(robert.birthDate).toBe('1940-04-15');
    expect(robert.birthPlace).toBe('London, England');
    expect(robert.deathDate).toBe('2010-01-03');
  });

  test('parses Susan correctly', () => {
    const susan = result.nodes.find((n) => n.firstName === 'Susan');
    expect(susan).toBeDefined();
    expect(susan.gender).toBe('female');
    expect(susan.birthDate).toBe('1945-06-20');
  });

  test('creates spouse relation between Robert and Susan', () => {
    const robert = result.nodes.find((n) => n.firstName === 'Robert');
    const susan = result.nodes.find((n) => n.firstName === 'Susan');
    const spouseRel = result.relations.find(
      (r) =>
        r.type === 'spouse' &&
        ((r.from === robert.id && r.to === susan.id) || (r.from === susan.id && r.to === robert.id))
    );
    expect(spouseRel).toBeDefined();
  });

  test('creates parent-child relations for Tom', () => {
    const tom = result.nodes.find((n) => n.firstName === 'Tom');
    expect(tom).toBeDefined();
    const parentChildRels = result.relations.filter(
      (r) => r.type === 'parent-child' && r.to === tom.id
    );
    expect(parentChildRels.length).toBe(2); // both Robert and Susan are parents
  });

  test('all node ids are unique UUIDs', () => {
    const ids = result.nodes.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
    ids.forEach((id) => {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});

describe('gedcom.js – round-trip', () => {
  test('export then re-import preserves node count', () => {
    const gedcomStr = exportToGedcom(sampleTree);
    const reimported = importFromGedcom(gedcomStr);
    expect(reimported.nodes.length).toBe(sampleTree.nodes.length);
  });

  test('export then re-import preserves names', () => {
    const gedcomStr = exportToGedcom(sampleTree);
    const reimported = importFromGedcom(gedcomStr);

    const names = reimported.nodes.map((n) => `${n.firstName} ${n.lastName}`);
    expect(names).toContain('John Smith');
    expect(names).toContain('Mary Smith');
    expect(names).toContain('Alice Smith');
  });

  test('export then re-import has relations', () => {
    const gedcomStr = exportToGedcom(sampleTree);
    const reimported = importFromGedcom(gedcomStr);
    expect(reimported.relations.length).toBeGreaterThan(0);
  });
});

describe('gedcom.js – edge cases', () => {
  test('empty tree exports valid GEDCOM', () => {
    const emptyTree = { name: 'Empty', nodes: [], relations: [] };
    const gedcom = exportToGedcom(emptyTree);
    expect(gedcom).toMatch(/^0 HEAD/);
    expect(gedcom.trim()).toMatch(/0 TRLR$/);
    const indiMatches = gedcom.match(/^0 @I\d+@ INDI$/gm);
    expect(indiMatches).toBeNull();
  });

  test('single person tree exports correctly', () => {
    const singleTree = {
      name: 'Single',
      nodes: [
        {
          id: 'solo-1',
          firstName: 'Solo',
          lastName: 'Person',
          maidenName: '',
          gender: 'male',
          birthDate: null,
          birthPlace: '',
          deathDate: null,
          deathPlace: '',
          photo: '',
          bio: '',
          x: 0,
          y: 0,
        },
      ],
      relations: [],
    };
    const gedcom = exportToGedcom(singleTree);
    expect(gedcom).toContain('Solo /Person/');
    expect(gedcom).toContain('1 SEX M');
    const indiMatches = gedcom.match(/^0 @I\d+@ INDI$/gm);
    expect(indiMatches.length).toBe(1);
    const famMatches = gedcom.match(/^0 @F\d+@ FAM$/gm);
    expect(famMatches).toBeNull();
  });

  test('import of empty GEDCOM returns empty arrays', () => {
    const minimalGedcom = '0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 TRLR';
    const result = importFromGedcom(minimalGedcom);
    expect(result.nodes).toEqual([]);
    expect(result.relations).toEqual([]);
  });

  test('import handles missing optional fields gracefully', () => {
    const minimal = `0 HEAD
0 @I1@ INDI
1 NAME Jane /Doe/
0 TRLR`;
    const result = importFromGedcom(minimal);
    expect(result.nodes.length).toBe(1);
    const jane = result.nodes[0];
    expect(jane.firstName).toBe('Jane');
    expect(jane.lastName).toBe('Doe');
    expect(jane.gender).toBe('');
    expect(jane.birthDate).toBeNull();
  });

  test('complex family with multiple children', () => {
    const complexGedcom = `0 HEAD
0 @I1@ INDI
1 NAME Dad /Complex/
1 SEX M
0 @I2@ INDI
1 NAME Mom /Complex/
1 SEX F
0 @I3@ INDI
1 NAME Child1 /Complex/
0 @I4@ INDI
1 NAME Child2 /Complex/
0 @I5@ INDI
1 NAME Child3 /Complex/
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
1 CHIL @I5@
0 TRLR`;
    const result = importFromGedcom(complexGedcom);
    expect(result.nodes.length).toBe(5);

    const dad = result.nodes.find((n) => n.firstName === 'Dad');
    const child1 = result.nodes.find((n) => n.firstName === 'Child1');
    const child2 = result.nodes.find((n) => n.firstName === 'Child2');
    const child3 = result.nodes.find((n) => n.firstName === 'Child3');

    // Each child should have 2 parent-child relations (one from dad, one from mom)
    const dadChildren = result.relations.filter(
      (r) => r.type === 'parent-child' && r.from === dad.id
    );
    expect(dadChildren.length).toBe(3);

    const child1Parents = result.relations.filter(
      (r) => r.type === 'parent-child' && r.to === child1.id
    );
    expect(child1Parents.length).toBe(2);
  });
});
