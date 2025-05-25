import { code, Coding, QuestionnaireResponseItemAnswer, QuestionnaireItemType, QuestionnaireItemOperator, QuestionnaireEnableWhenBehavior, QuestionnaireItemInitial } from '@i4mi/fhir_r4';
export declare enum ItemControlType {
    AUTO_COMPLETE = "autocomplete",
    DROP_DOWN = "drop-down",
    CHECK_BOX = "check-box",
    LOOK_UP = "lookup",
    RADIO_BUTTON = "radio-button",
    SLIDER = "slider",
    SPINNER = "spinner",
    TEXT_BOX = "text-box",
    LIST = "list",
    TABLE = "table",
    HORIZONTAL_ANSWER_TABLE = "htable",
    GROUP_TABLE = "gtable",
    ANSWER_TABLE = "atable",
    HEADER = "header",
    FOOTER = "footer",
    INLINE = "inline",
    PROMPT = "prompt",
    UNIT = "unit",
    LOWER_BOUND = "lower",
    UPPER_BOUND = "upper",
    FLY_OVER = "flyover",
    HELP_BUTTON = "help"
}
export interface IQuestion {
    id: string;
    type: QuestionnaireItemType;
    label: {
        [language: string]: string;
    };
    prefix?: string;
    answerOptions: IAnswerOption[];
    dependingQuestions: {
        dependingQuestion: IQuestion;
        criteria: {
            answer: QuestionnaireResponseItemAnswer;
            operator: QuestionnaireItemOperator;
        }[];
    }[];
    dependingQuestionsEnableBehaviour?: QuestionnaireEnableWhenBehavior;
    required: boolean;
    allowsMultipleAnswers: boolean;
    isEnabled: boolean;
    readOnly: boolean;
    selectedAnswers: QuestionnaireResponseItemAnswer[];
    subItems?: IQuestion[];
    isInvalid: boolean;
    initial?: QuestionnaireItemInitial[];
    options?: IQuestionOptions;
}
export interface IAnswerOption {
    answer: {
        [language: string]: string;
    };
    code: QuestionnaireResponseItemAnswer;
    disableOtherAnswers?: code[];
}
export interface IQuestionOptions {
    controlType?: ItemControlType;
    controlTypes: ItemControlType[];
    min?: number;
    max?: number;
    sliderStep?: number;
    unit?: Coding;
    format?: string;
    initialExpression?: string;
    calculatedExpression?: string;
}
