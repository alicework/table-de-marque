// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  decouperCsv,
  ErreurExport,
  lireExportWebaffiligue,
  nettoyerValeur,
  normaliserEntete,
} from './lireExport'

/** Encode en ISO-8859-1 (tous les caractères utilisés ici sont ≤ U+00FF). */
const latin1 = (texte: string) => Uint8Array.from(texte, (c) => c.charCodeAt(0))
const utf8AvecBom = (texte: string) => new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(texte)])

const ENTETE =
  '"=""N° Association""";"=""Nom association""";"=""Type licence""";"=""N° Adherent""";"=""Civilite""";"=""Nom""";"=""Prénom"""'
const ligne = (licence: string, civilite: string, nom: string, prenom: string, association = '033550002') =>
  `"=""${association}""";"=""SAINT DELPHIN BASKET""";"=""Loisirs""";"=""${licence}""";"=""${civilite}""";"=""${nom}""";"=""${prenom}"""`

describe('utilitaires CSV', () => {
  it('découpe en respectant les guillemets, les guillemets doublés et les fins de ligne', () => {
    expect(decouperCsv('a;"b;c";"d""e"\r\nf;g;h\n\n', ';')).toEqual([
      ['a', 'b;c', 'd"e'],
      ['f', 'g', 'h'],
    ])
  })

  it('retire l’encapsulation de formule Excel', () => {
    expect(nettoyerValeur('="033_1"')).toBe('033_1')
    expect(nettoyerValeur(' Oui ')).toBe('Oui')
  })

  it('retire le « = » laissé quand la formule n’est pas entourée de guillemets CSV', () => {
    // ="033_1" non encapsulé : le découpage CSV consomme les guillemets et laisse =033_1
    expect(decouperCsv('="033_1";="Martin";Oui', ';')[0].map(nettoyerValeur)).toEqual(['033_1', 'Martin', 'Oui'])
  })

  it('normalise les intitulés de colonnes', () => {
    expect(normaliserEntete('N° Adherent')).toBe('n adherent')
    expect(normaliserEntete('Prénom')).toBe('prenom')
  })
})

describe('lireExportWebaffiligue', () => {
  it("lit l'export anonymisé réel", () => {
    const octets = readFileSync(new URL('../../Sortie_simple_Ufolep.csv', import.meta.url))
    const { clubs, lignesIgnorees } = lireExportWebaffiligue(octets)
    expect(lignesIgnorees).toBe(0)
    expect(clubs).toHaveLength(1)
    expect(clubs[0].numeroAssociation).toBe('033550002')
    expect(clubs[0].nom).toBe('SAINT DELPHIN BASKET')
    expect(clubs[0].licencies).toHaveLength(22)
    expect(clubs[0].licencies[0]).toEqual({
      licence: '033_00000101',
      nom: '',
      prenom: '',
      civilite: 'M',
      typeLicence: 'Competition',
    })
    expect(clubs[0].licencies[1].civilite).toBe('Mme')
    expect(clubs[0].licencies.at(-1)?.licence).toBe('ZZ00000005')
    expect(clubs[0].licencies.filter((l) => l.civilite === 'Mme')).toHaveLength(6)
    expect(clubs[0].licencies.filter((l) => l.typeLicence === 'Loisirs')).toHaveLength(1)
  })

  it('lit un export dont les valeurs ="…" ne sont pas entourées de guillemets, sans aucun « = »', () => {
    const texte =
      '="N° Association";="Nom association";="Type licence";="N° Adherent";="Civilite";="Nom";="Prénom"\n' +
      '="033550002";="SAINT DELPHIN BASKET";="Loisirs";="033_1";="Mme";="Lefèvre";="Bérénice"\n'
    const { clubs } = lireExportWebaffiligue(latin1(texte))
    expect(clubs[0]).toMatchObject({ numeroAssociation: '033550002', nom: 'SAINT DELPHIN BASKET' })
    expect(clubs[0].licencies[0]).toEqual({
      licence: '033_1',
      nom: 'Lefèvre',
      prenom: 'Bérénice',
      civilite: 'Mme',
      typeLicence: 'Loisirs',
    })
  })

  it('lit les noms accentués en ISO-8859-1', () => {
    const { clubs } = lireExportWebaffiligue(latin1(`${ENTETE}\n${ligne('033_1', 'Mme', 'Lefèvre', 'Bérénice')}\n`))
    expect(clubs[0].licencies[0]).toMatchObject({ nom: 'Lefèvre', prenom: 'Bérénice', civilite: 'Mme' })
  })

  it('lit un fichier ré-enregistré en UTF-8 avec BOM', () => {
    const { clubs } = lireExportWebaffiligue(utf8AvecBom(`${ENTETE}\n${ligne('033_1', 'M', 'Noël', 'Raphaël')}\n`))
    expect(clubs[0].licencies[0]).toMatchObject({ nom: 'Noël', prenom: 'Raphaël', civilite: 'M' })
  })

  it('lit un export ré-enregistré par Excel (UTF-8 avec BOM, virgule, en-têtes non encapsulés)', () => {
    const texte = [
      'N° Association,Nom association,Type licence,N° Adherent,Civilite,Nom,Prénom',
      '033550002,SAINT DELPHIN BASKET,Loisirs,033_1,Mme,Lefèvre,Bérénice',
    ].join('\r\n')
    const { clubs } = lireExportWebaffiligue(utf8AvecBom(`${texte}\r\n`))
    expect(clubs).toHaveLength(1)
    expect(clubs[0].licencies[0]).toMatchObject({
      licence: '033_1',
      nom: 'Lefèvre',
      prenom: 'Bérénice',
      civilite: 'Mme',
    })
  })

  it('accepte le séparateur virgule', () => {
    const texte = `${ENTETE}\n${ligne('033_1', 'M', 'Martin', 'Hugo')}`.replaceAll(';', ',')
    expect(lireExportWebaffiligue(latin1(texte)).clubs[0].licencies[0].nom).toBe('Martin')
  })

  it('ignore les lignes sans n° de licence et les compte', () => {
    const texte = `${ENTETE}\n${ligne('033_1', 'M', 'Martin', 'Hugo')}\n${ligne('', 'Mme', 'Sans', 'Licence')}\n`
    const resultat = lireExportWebaffiligue(latin1(texte))
    expect(resultat.clubs[0].licencies).toHaveLength(1)
    expect(resultat.lignesIgnorees).toBe(1)
  })

  it('regroupe par association', () => {
    const texte = `${ENTETE}\n${ligne('1', 'M', 'A', 'a')}\n${ligne('2', 'M', 'B', 'b', '033999999')}\n`
    expect(lireExportWebaffiligue(latin1(texte)).clubs.map((c) => c.numeroAssociation)).toEqual([
      '033550002',
      '033999999',
    ])
  })

  it('refuse un fichier dont des colonnes manquent, sans rien lire', () => {
    const lecture = () => lireExportWebaffiligue(latin1('Nom;Prénom\nMartin;Hugo\n'))
    expect(lecture).toThrow(ErreurExport)
    expect(lecture).toThrow(
      "Ce fichier n'est pas un export LiguAsso reconnu : colonnes absentes (N° Adherent, Civilite, N° Association, Nom association).",
    )
  })

  it('refuse un fichier vide ou sans licencié', () => {
    expect(() => lireExportWebaffiligue(new Uint8Array())).toThrow('Fichier vide.')
    expect(() => lireExportWebaffiligue(latin1(`${ENTETE}\n`))).toThrow('Aucun licencié trouvé dans ce fichier.')
  })
})
