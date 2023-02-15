import {Questionnaire, QuestionnaireResponse} from '@i4mi/fhir_r4';
import {QuestionnaireData} from '../dist/QuestionnaireData';

const I18N_QUESTIONNAIRE = require('./questionnaires/i18n.json') as Questionnaire;

const LANGUAGES = ['de', 'fr', 'it']; // 'it' is not in Questionnaire
const testData = new QuestionnaireData(I18N_QUESTIONNAIRE, LANGUAGES);

test('availableLanguages', () => {
  expect(testData.availableLanguages).toEqual(LANGUAGES);
});

test('getQuestionnaireTitle', () => {
  expect(testData.getQuestionnaireTitle('fr')).toEqual('Echelle de Zarit ou inventaire du fardeau');
  // test fallback for language that is not in questionnaire
  expect(testData.getQuestionnaireTitle('it')).toEqual('Fragen zur Belastung, Aufwand, Soziodemographie (Version III)');
  expect(testData.getQuestionnaireTitle('')).toEqual('Fragen zur Belastung, Aufwand, Soziodemographie (Version III)');
});

test('getQuestionnaireDescription', () => {
  expect(testData.getQuestionnaireDescription('fr')?.length).toBeGreaterThan(0);
  expect(testData.getQuestionnaireDescription('de')?.length).toBeGreaterThan(0);
  expect(testData.getQuestionnaireDescription('') === testData.getQuestionnaireDescription('de')).toBeTruthy();
});

test('answering', () => {
  const q1 = testData.findQuestionById('Q1');
  expect(q1).toBeDefined();
  const q2 = testData.findQuestionById('Q2');
  expect(q2).toBeDefined();
  const q3 = testData.findQuestionById('Q3');
  expect(q3).toBeDefined();

  // answer with full answer
  expect(() =>
    testData.updateQuestionAnswers(q1!, {
      answer: {
        de: 'selten',
        fr: 'rarement'
      },
      code: {
        valueCoding: {
          system: 'http://midata.coop/approches/zarit-likert',
          code: '1'
        }
      }
    })
  ).not.toThrow();
  // answer with only one language
  expect(() =>
    testData.updateQuestionAnswers(q2!, {
      answer: {
        de: 'häufig'
      },
      code: {
        valueCoding: {
          system: 'http://midata.coop/approches/zarit-likert',
          code: '3'
        }
      }
    })
  ).not.toThrow();
  // answer with wrong language (should work never the less)
  expect(() =>
    testData.updateQuestionAnswers(q3!, {
      answer: {
        it: 'quasi sempre'
      },
      code: {
        valueCoding: {
          system: 'http://midata.coop/approches/zarit-likert',
          code: '4'
        }
      }
    })
  ).not.toThrow();
});
test('getQuestionnaireResponse', () => {
  const response: {[lang: string]: QuestionnaireResponse | undefined} = {
  };
  const now = new Date();
  expect(() => response.de = testData.getQuestionnaireResponse('de', { date: now})).not.toThrow();
  expect(() => response.fr = testData.getQuestionnaireResponse('fr', { date: now})).not.toThrow();
  expect(() => response.it = testData.getQuestionnaireResponse('it', { date: now})).not.toThrow();
  expect(() => response.en = testData.getQuestionnaireResponse('en', { date: now})).toThrow();
  expect(response.de).toBeDefined();
  expect(response.fr).toBeDefined();
  expect(response.it).toBeDefined();
  // it is fallback, since the questionnaire has no IT strings
  expect(response.de).toEqual(response.it);
});
