'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Escape GEDCOM special characters (keep it simple for 5.5.1)
 */
function escapeGedcom(str) {
  if (!str) return '';
  return String(str).replace(/\r?\n/g, ' ').trim();
}

/**
 * Format a date string as GEDCOM date (D MON YYYY)
 */
function formatGedcomDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return escapeGedcom(dateStr);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Convert gender to GEDCOM SEX value
 */
function toGedcomSex(gender) {
  if (!gender) return 'U';
  const g = gender.toLowerCase();
  if (g === 'male' || g === 'm') return 'M';
  if (g === 'female' || g === 'f') return 'F';
  return 'U';
}

/**
 * Build a map of node id → GEDCOM INDI tag (e.g. @I1@)
 */
function buildIndiMap(nodes) {
  const map = {};
  nodes.forEach((node, idx) => {
    map[node.id] = `@I${idx + 1}@`;
  });
  return map;
}

/**
 * Export tree to GEDCOM 5.5.1 string
 * @param {object} tree - Tree document (with .nodes and .relations arrays)
 * @returns {string}
 */
function exportToGedcom(tree) {
  const nodes = tree.nodes || [];
  const relations = tree.relations || [];
  const indiMap = buildIndiMap(nodes);

  const lines = [];

  // Header
  lines.push('0 HEAD');
  lines.push('1 SOUR Rodolog');
  lines.push('2 VERS 2.0');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('1 CHAR UTF-8');

  // INDI records
  nodes.forEach((node) => {
    const indi = indiMap[node.id];
    lines.push(`0 ${indi} INDI`);

    // NAME
    const firstName = escapeGedcom(node.firstName) || '';
    const lastName = escapeGedcom(node.lastName) || '';
    const maidenName = escapeGedcom(node.maidenName);
    const nameLine = `${firstName} /${lastName}/`;
    lines.push(`1 NAME ${nameLine}`);
    if (node.firstName) lines.push(`2 GIVN ${escapeGedcom(node.firstName)}`);
    if (node.lastName) lines.push(`2 SURN ${escapeGedcom(node.lastName)}`);
    if (maidenName) lines.push(`2 _MARN ${maidenName}`);

    // SEX
    lines.push(`1 SEX ${toGedcomSex(node.gender)}`);

    // BIRT
    if (node.birthDate || node.birthPlace) {
      lines.push('1 BIRT');
      if (node.birthDate) lines.push(`2 DATE ${formatGedcomDate(node.birthDate)}`);
      if (node.birthPlace) lines.push(`2 PLAC ${escapeGedcom(node.birthPlace)}`);
    }

    // DEAT
    if (node.deathDate || node.deathPlace) {
      lines.push('1 DEAT');
      if (node.deathDate) lines.push(`2 DATE ${formatGedcomDate(node.deathDate)}`);
      if (node.deathPlace) lines.push(`2 PLAC ${escapeGedcom(node.deathPlace)}`);
    }

    // BIO as NOTE
    if (node.bio) {
      lines.push(`1 NOTE ${escapeGedcom(node.bio)}`);
    }
  });

  // FAM records
  // Group spouse relations into families, then add parent-child
  const famMap = {}; // key: sorted spouseIds → fam index
  const families = []; // { husbId, wifeId, children: [] }

  relations.forEach((rel) => {
    if (rel.type === 'spouse') {
      const key = [rel.from, rel.to].sort().join(':');
      if (!famMap[key]) {
        famMap[key] = families.length;
        families.push({ husbId: rel.from, wifeId: rel.to, children: [] });
      }
    }
  });

  relations.forEach((rel) => {
    if (rel.type === 'parent-child') {
      const parentId = rel.from;
      const childId = rel.to;

      // Find a family where this parent is already a spouse
      let famIdx = families.findIndex(
        (f) => f.husbId === parentId || f.wifeId === parentId
      );

      if (famIdx === -1) {
        // Create a new family for this parent
        famIdx = families.length;
        families.push({ husbId: parentId, wifeId: null, children: [] });
      }

      if (!families[famIdx].children.includes(childId)) {
        families[famIdx].children.push(childId);
      }
    }
  });

  families.forEach((fam, idx) => {
    const famTag = `@F${idx + 1}@`;
    lines.push(`0 ${famTag} FAM`);

    if (fam.husbId && indiMap[fam.husbId]) {
      lines.push(`1 HUSB ${indiMap[fam.husbId]}`);
    }
    if (fam.wifeId && indiMap[fam.wifeId]) {
      lines.push(`1 WIFE ${indiMap[fam.wifeId]}`);
    }
    fam.children.forEach((childId) => {
      if (indiMap[childId]) {
        lines.push(`1 CHIL ${indiMap[childId]}`);
      }
    });

    // Back-reference FAM in each INDI: we'll just note it (optional enhancement)
  });

  // Trailer
  lines.push('0 TRLR');

  return lines.join('\r\n');
}

/**
 * Parse a GEDCOM date string into ISO date string (best effort)
 */
function parseGedcomDate(str) {
  if (!str) return null;
  const months = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
  };
  const match = str.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  // Just year
  const yearOnly = str.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;
  return null;
}

/**
 * Import from GEDCOM text, returns { nodes, relations }
 * @param {string} text - GEDCOM file content
 * @returns {{ nodes: object[], relations: object[] }}
 */
function importFromGedcom(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd());
  const nodes = [];
  const relations = [];

  // Parse into records: list of { level, tag, ref, value, children }
  const records = [];
  let current = null;
  const stack = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^(\d+)\s+(@[^@]+@\s+)?(\w+)(?:\s+(.*))?$/);
    if (!match) continue;

    const level = parseInt(match[1]);
    const ref = (match[2] || '').trim().replace(/@/g, '') || null;
    const tag = match[3];
    const value = (match[4] || '').trim();

    const record = { level, tag, ref, value, children: [] };

    if (level === 0) {
      stack.length = 0;
      records.push(record);
      current = record;
      stack.push(record);
    } else {
      // Pop stack until we find the parent
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(record);
      }
      stack.push(record);
    }
  }

  // INDI records → nodes
  const indiToNodeId = {}; // GEDCOM @Ix@ → our uuid
  const famRecords = [];

  for (const rec of records) {
    if (rec.tag === 'INDI') {
      const indiRef = rec.ref;
      const nodeId = uuidv4();
      indiToNodeId[indiRef] = nodeId;

      const node = {
        id: nodeId,
        firstName: '',
        lastName: '',
        maidenName: '',
        gender: '',
        birthDate: null,
        birthPlace: '',
        deathDate: null,
        deathPlace: '',
        photo: '',
        bio: '',
        x: 0,
        y: 0,
      };

      for (const child of rec.children) {
        if (child.tag === 'NAME') {
          // e.g. "John /Doe/"
          const nameParts = child.value.match(/^(.*?)\s*\/(.+?)\/\s*$/);
          if (nameParts) {
            node.firstName = nameParts[1].trim();
            node.lastName = nameParts[2].trim();
          } else {
            node.firstName = child.value.trim();
          }
          // GIVN / SURN override
          for (const nc of child.children) {
            if (nc.tag === 'GIVN') node.firstName = nc.value;
            if (nc.tag === 'SURN') node.lastName = nc.value;
            if (nc.tag === '_MARN') node.maidenName = nc.value;
          }
        } else if (child.tag === 'SEX') {
          const sex = child.value.toUpperCase();
          if (sex === 'M') node.gender = 'male';
          else if (sex === 'F') node.gender = 'female';
        } else if (child.tag === 'BIRT') {
          for (const bc of child.children) {
            if (bc.tag === 'DATE') node.birthDate = parseGedcomDate(bc.value);
            if (bc.tag === 'PLAC') node.birthPlace = bc.value;
          }
        } else if (child.tag === 'DEAT') {
          for (const dc of child.children) {
            if (dc.tag === 'DATE') node.deathDate = parseGedcomDate(dc.value);
            if (dc.tag === 'PLAC') node.deathPlace = dc.value;
          }
        } else if (child.tag === 'NOTE') {
          node.bio = child.value;
        }
      }

      nodes.push(node);
    } else if (rec.tag === 'FAM') {
      famRecords.push(rec);
    }
  }

  // FAM records → relations
  for (const fam of famRecords) {
    let husbIndi = null;
    let wifeIndi = null;
    const children = [];

    for (const child of fam.children) {
      if (child.tag === 'HUSB') {
        husbIndi = child.value.replace(/@/g, '').trim();
      } else if (child.tag === 'WIFE') {
        wifeIndi = child.value.replace(/@/g, '').trim();
      } else if (child.tag === 'CHIL') {
        children.push(child.value.replace(/@/g, '').trim());
      }
    }

    const husbId = husbIndi ? indiToNodeId[husbIndi] : null;
    const wifeId = wifeIndi ? indiToNodeId[wifeIndi] : null;

    if (husbId && wifeId) {
      relations.push({ id: uuidv4(), from: husbId, to: wifeId, type: 'spouse' });
    }

    children.forEach((childIndi) => {
      const childId = indiToNodeId[childIndi];
      if (!childId) return;

      if (husbId) {
        relations.push({ id: uuidv4(), from: husbId, to: childId, type: 'parent-child' });
      }
      if (wifeId) {
        relations.push({ id: uuidv4(), from: wifeId, to: childId, type: 'parent-child' });
      }
    });
  }

  return { nodes, relations };
}

module.exports = { exportToGedcom, importFromGedcom };
