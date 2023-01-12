import { Questionnaire, } from '@i4mi/fhir_r4';
import { QuestionnaireData } from '../dist/QuestionnaireData';

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