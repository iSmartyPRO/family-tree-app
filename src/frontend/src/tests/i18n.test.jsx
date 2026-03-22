import { describe, it, expect } from 'vitest'
import ru from '../i18n/locales/ru.json'
import en from '../i18n/locales/en.json'
import kg from '../i18n/locales/kg.json'
import tr from '../i18n/locales/tr.json'

function flattenKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      acc.push(...flattenKeys(obj[key], fullKey))
    } else {
      acc.push(fullKey)
    }
    return acc
  }, [])
}

describe('i18n locale files', () => {
  const ruKeys = flattenKeys(ru).sort()
  const enKeys = flattenKeys(en).sort()
  const kgKeys = flattenKeys(kg).sort()
  const trKeys = flattenKeys(tr).sort()

  it('EN has same keys as RU', () => {
    expect(enKeys).toEqual(ruKeys)
  })

  it('KG has same keys as RU', () => {
    expect(kgKeys).toEqual(ruKeys)
  })

  it('TR has same keys as RU', () => {
    expect(trKeys).toEqual(ruKeys)
  })

  it('RU locale has required nav keys', () => {
    expect(ru.nav).toBeDefined()
    expect(ru.nav.home).toBeDefined()
    expect(ru.nav.login).toBeDefined()
    expect(ru.nav.logout).toBeDefined()
    expect(ru.nav.dashboard).toBeDefined()
  })

  it('RU locale has required auth keys', () => {
    expect(ru.auth).toBeDefined()
    expect(ru.auth.login_title).toBeDefined()
    expect(ru.auth.email).toBeDefined()
    expect(ru.auth.password).toBeDefined()
  })

  it('RU locale has required tree keys', () => {
    expect(ru.tree).toBeDefined()
    expect(ru.tree.add_person).toBeDefined()
    expect(ru.tree.add_relation).toBeDefined()
    expect(ru.tree.save).toBeDefined()
  })

  it('All locales have non-empty values', () => {
    const checkNonEmpty = (obj, lang) => {
      Object.entries(obj).forEach(([key, val]) => {
        if (typeof val === 'object') {
          checkNonEmpty(val, lang)
        } else {
          expect(val, `${lang}.${key} should not be empty`).toBeTruthy()
        }
      })
    }
    checkNonEmpty(ru, 'ru')
    checkNonEmpty(en, 'en')
    checkNonEmpty(kg, 'kg')
    checkNonEmpty(tr, 'tr')
  })

  it('i18n instance initializes correctly', async () => {
    const i18n = (await import('../i18n/index.js')).default
    expect(i18n.isInitialized).toBe(true)
    expect(['ru', 'en', 'kg', 'tr']).toContain(i18n.language)
  })
})
