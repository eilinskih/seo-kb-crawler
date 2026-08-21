import { competitorContentEvidenceObservations } from './competitor-content-evidence';
import { normalizeKeyword } from './normalize-keyword';

describe('competitorContentEvidenceObservations', () => {
  it('extracts observed competitor phrases without marketplace boilerplate', () => {
    const observations = competitorContentEvidenceObservations({
      topicSeed: 'podnośnik hydrauliczny',
      documents: [{
        url: 'https://example.pl/podnosniki',
        title: 'Podnośniki hydrauliczne i warsztatowe - Niska cena',
        metaDescription:
          'Podnośnik hydrauliczny samochodowy, słupkowy i niskoprofilowy do warsztatu.',
        headings: [
          { level: 1, text: 'Podnośniki hydrauliczne samochodowe' },
          { level: 2, text: 'Podnośnik hydrauliczny słupkowy 20T' },
          { level: 2, text: 'Podnośnik warsztatowy o dużej wysokości podnoszenia' },
        ],
        breadcrumbs: ['Narzędzia', 'Podnośniki samochodowe'],
        bodyText:
          'Wybierz podnośnik hydrauliczny żaba do niskiego auta. Wejdź i znajdź to, czego szukasz.',
      }],
    });
    const phrases = observations.map((observation) =>
      normalizeKeyword(observation.observedText),
    );

    expect(phrases).toEqual(expect.arrayContaining([
      'podnośniki hydrauliczne i warsztatowe',
      'podnośnik hydrauliczny samochodowy',
      'podnośnik hydrauliczny słupkowy 20t',
      'podnośnik warsztatowy o dużej wysokości podnoszenia',
      'podnośnik hydrauliczny żaba do niskiego auta',
    ]));
    expect(phrases).not.toEqual(expect.arrayContaining([
      'Niska cena',
      'Wejdź i znajdź to, czego szukasz',
    ]));
  });

  it('keeps extraction evidence-first and does not invent unrelated modifiers', () => {
    const observations = competitorContentEvidenceObservations({
      topicSeed: 'crown coins casino',
      documents: [{
        url: 'https://example.com/crown-coins',
        title: 'Crown Coins Casino bonus and no deposit codes',
        headings: [
          { level: 1, text: 'Crown Coins Casino review' },
          { level: 2, text: 'Crown Coins Casino payment methods' },
        ],
        bodyText: 'Players compare Crown Coins Casino slots and login offers.',
      }],
    });
    const phrases = observations.map((observation) =>
      observation.observedText.toLowerCase(),
    );

    expect(phrases).toEqual(expect.arrayContaining([
      'crown coins casino bonus and no deposit codes',
      'crown coins casino review',
      'crown coins casino payment methods',
    ]));
    expect(phrases).not.toEqual(expect.arrayContaining([
      'crown coins casino pregnancy',
      'crown coins casino for men',
    ]));
  });
});
