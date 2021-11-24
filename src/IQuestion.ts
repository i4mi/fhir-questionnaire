import { code, Coding, QuestionnaireResponseItemAnswer, QuestionnaireItemType, QuestionnaireItemOperator, QuestionnaireEnableWhenBehavior } from '@i4mi/fhir_r4';

export enum ItemControlType {
    SPINNER = 'spinner',
    SLIDER = 'slider'
}

export enum PopulateType {
    '80904-6' = 'BIRTH_YEAR',
    '46098-0' = 'SEX'
}

export interface IQuestion {
    id: string; // represents linkId in QuestionnaireItem
    type: QuestionnaireItemType;
    label: {[language: string]: string};
    prefix?: string;
    answerOptions: IAnswerOption[];
    dependingQuestions:
        {
            dependingQuestion: IQuestion;
            criteria: {
                answer: QuestionnaireResponseItemAnswer,
                operator: QuestionnaireItemOperator
            }[];
        }[];
    dependingQuestionsEnableBehaviour?: QuestionnaireEnableWhenBehavior;
    required: boolean; // use required in QuestionnaireItem
    allowsMultipleAnswers: boolean;
    isEnabled: boolean;
    readOnly: boolean;
    selectedAnswers: QuestionnaireResponseItemAnswer[];
    subItems?: IQuestion[];
    relatedResourceId?: string;
    isInvalid?: boolean;
    options?: IQuestionOptions;
}

export interface IAnswerOption {
    answer: {[language: string]: string};
    code: QuestionnaireResponseItemAnswer;
    disableOtherAnswers?: code[];
}

export interface IQuestionOptions {
    controlType?: ItemControlType;
    min?: number;
    max?: number;
    sliderStep?: number;
    unit?: Coding;
    format?: string;
    populateType?: PopulateType;
    calculatedExpression?: string;
}
