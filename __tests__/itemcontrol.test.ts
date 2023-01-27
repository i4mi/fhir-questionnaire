import {Questionnaire, QuestionnaireResponse} from '@i4mi/fhir_r4';
import { ItemControlType } from '../dist/IQuestion';
import {QuestionnaireData} from '../dist/QuestionnaireData';

const ITEM_CONTROL_QUESTIONNAIRE = require('./questionnaires/itemControl.json') as Questionnaire;

const LANG = ['de']; 
const testData = new QuestionnaireData(ITEM_CONTROL_QUESTIONNAIRE, LANG);

test('single extension', () => {
  const groupList = testData.findQuestionById('group-list');
  expect(groupList).toBeDefined();
  expect(groupList?.options?.controlTypes[0]).toBeDefined();
  expect(groupList?.options?.controlTypes[0]).toEqual(ItemControlType.LIST);
});

test('multiple extensions, but only one itemControl', () => {
  const sliderItem = testData.findQuestionById('question-slider');
  expect(sliderItem).toBeDefined();
  expect(sliderItem?.options?.controlTypes.length).toBe(1);
  expect(sliderItem?.options?.controlTypes[0]).toEqual(ItemControlType.SLIDER);
});

test('multiple extensions, multiple itemControl', () => {
  const multiple = testData.findQuestionById('question-multiple');
  expect(multiple?.options?.controlTypes.length).toBe(2);
  expect(multiple?.options?.controlTypes[0]).toEqual(ItemControlType.HELP_BUTTON);
  expect(multiple?.options?.controlTypes[1]).toEqual(ItemControlType.TEXT_BOX);
});