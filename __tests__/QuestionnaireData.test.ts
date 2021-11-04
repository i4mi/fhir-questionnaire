import { QuestionnaireData } from '../src/QuestionnaireData';
import questionnaire from './questionnaire';

test('Just testing', () => {
    const qd = new QuestionnaireData(questionnaire)

    expect(1 + 3).toBe(4);
});
