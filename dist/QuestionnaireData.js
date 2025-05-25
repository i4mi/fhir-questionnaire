"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireData = void 0;
var fhirpath_1 = __importDefault(require("fhirpath"));
var fhir_r4_1 = require("@i4mi/fhir_r4");
var IQuestion_1 = require("./IQuestion");
var UNSELECT_OTHERS_EXTENSION = 'http://midata.coop/extensions/valueset-unselect-others';
var ITEM_CONTROL_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
var ITEM_CONTROL_EXTENSION_SYSTEM = 'http://hl7.org/fhir/questionnaire-item-control';
var MIN_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/minValue';
var MAX_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/maxValue';
var ENTRY_FORMAT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/entryFormat';
var SLIDER_STEP_VALUE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue';
var UNIT_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit';
var HIDDEN_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden';
var CALCULATED_EXPRESSION_EXTENSION = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression';
var QUESTIONNAIRERESPONSE_CODING_EXTENSION_URL = 'http://midata.coop/extensions/response-code';
var INITIAL_EXPRESSION_EXTENSION = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression';
var LANGUAGE_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/translation';
var PRIMITIVE_VALUE_X = [
    'valueString',
    'valueInteger',
    'valueBoolean',
    'valueDecimal',
    'valueDate',
    'valueDateTime',
    'valueTime',
    'valueUri'
];
var COMPLEX_VALUE_X = [
    {
        type: 'valueCoding',
        isMatching: function (criterium, answerOption) {
            if (criterium.valueCoding && answerOption.code.valueCoding) {
                return criterium.valueCoding.system === answerOption.code.valueCoding.system
                    && criterium.valueCoding.code === answerOption.code.valueCoding.code;
            }
            else {
                return false;
            }
        }
    },
    {
        type: 'valueAttachment',
        isMatching: function (criterium, answerOption) {
            if (criterium.valueAttachment) {
                console.warn('Sorry, picking valueAttachment from AnswerOptions is currently not supported.', answerOption);
            }
            return false;
        }
    },
    {
        type: 'valueReference',
        isMatching: function (criterium, answerOption) {
            if (criterium.valueReference && answerOption.code.valueReference) {
                return criterium.valueReference.reference === answerOption.code.valueReference.reference
                    || criterium.valueReference.identifier === answerOption.code.valueReference.identifier;
            }
            else {
                return false;
            }
        }
    },
    {
        type: 'valueQuantity',
        isMatching: function (criterium, answerOption) {
            if (criterium.valueQuantity && answerOption.code.valueQuantity) {
                return criterium.valueQuantity.value === answerOption.code.valueQuantity.value
                    && (criterium.valueQuantity.unit === answerOption.code.valueQuantity.unit
                        || criterium.valueQuantity.code === answerOption.code.valueQuantity.code);
            }
            else {
                return false;
            }
        }
    }
];
function checkIfDependingQuestionIsEnabled(_dependant, _depending, _answer) {
    // we start with true, when undefined or any with false
    var isEnabled = (_dependant.dependingQuestionsEnableBehaviour == fhir_r4_1.QuestionnaireEnableWhenBehavior.ALL);
    _depending.criteria.forEach(function (criterium) {
        var _a, _b;
        var evaluatesToTrue = false;
        var crit = ((_a = criterium.answer.valueCoding) === null || _a === void 0 ? void 0 : _a.code) ||
            criterium.answer.valueDate ||
            criterium.answer.valueDateTime ||
            criterium.answer.valueTime ||
            criterium.answer.valueDecimal ||
            criterium.answer.valueString ||
            criterium.answer.valueInteger || (criterium.answer.valueBoolean == undefined
            ? undefined
            : criterium.answer.valueBoolean);
        var answ = ((_b = _answer === null || _answer === void 0 ? void 0 : _answer.code.valueCoding) === null || _b === void 0 ? void 0 : _b.code) ||
            (_answer === null || _answer === void 0 ? void 0 : _answer.code.valueDate) ||
            (_answer === null || _answer === void 0 ? void 0 : _answer.code.valueDateTime) ||
            (_answer === null || _answer === void 0 ? void 0 : _answer.code.valueDecimal) ||
            (_answer === null || _answer === void 0 ? void 0 : _answer.code.valueString) ||
            (_answer === null || _answer === void 0 ? void 0 : _answer.code.valueInteger) || ((_answer === null || _answer === void 0 ? void 0 : _answer.code.valueBoolean) == undefined
            ? undefined
            : _answer === null || _answer === void 0 ? void 0 : _answer.code.valueBoolean);
        if (crit != undefined) {
            evaluatesToTrue = evaluateAnswersForDependingQuestion(answ, crit, criterium.operator);
        }
        isEnabled = (_dependant.dependingQuestionsEnableBehaviour == fhir_r4_1.QuestionnaireEnableWhenBehavior.ALL)
            ? (evaluatesToTrue && isEnabled) // only true, when criteria before were true
            : (evaluatesToTrue || isEnabled); // true when evaluates to true or questions before were true
    });
    return isEnabled;
}
/**
* Evaluates a given answer with a criterium and an operator, for enabling and disabling depending questions.
* @param _answer        the given answer, as string (also for code etc) or as a number (when using GE, GT, LE & LT operator)
* @param _criterium     the criterium against which the given answer is compared
* @param _operator      defines if the answer and criterium must be equal or not equal etc.
* @returns              true if answer and criterium match with the given operator, false if not so.
**/
function evaluateAnswersForDependingQuestion(_answer, _criterium, _operator) {
    // make sure we have both comparants as number if one is
    if (typeof _answer === 'number' && typeof _criterium !== 'number') {
        _criterium = Number(_criterium);
    }
    else if (typeof _criterium === 'number' && typeof _answer !== 'number') {
        _answer = Number(_answer);
    }
    switch (_operator) {
        case fhir_r4_1.QuestionnaireItemOperator.EXISTS:
            if (_criterium) {
                return Array.isArray(_answer)
                    ? _answer.length > 0
                    : _answer != undefined;
            }
            else {
                return Array.isArray(_answer)
                    ? _answer.length === 0
                    : _answer == undefined;
            }
        case fhir_r4_1.QuestionnaireItemOperator.E:
            return _answer === _criterium;
        case fhir_r4_1.QuestionnaireItemOperator.NE:
            return _answer != _criterium && _answer !== undefined;
        case fhir_r4_1.QuestionnaireItemOperator.GE:
            return _answer == undefined
                ? false
                : _answer >= _criterium;
        case fhir_r4_1.QuestionnaireItemOperator.LE:
            return _answer == undefined
                ? false
                : _answer <= _criterium;
        case fhir_r4_1.QuestionnaireItemOperator.GT:
            return _answer == undefined
                ? false
                : _answer > _criterium;
        case fhir_r4_1.QuestionnaireItemOperator.LT:
            return _answer == undefined
                ? false
                : _answer < _criterium;
        default: return false;
    }
}
/**
 * Recursively iterates through question items to check for completeness
 * @param _question       the question that should be checked for completeness with all its subquestions
 * @param _onlyRequired   parameter that indicates if only questions that are actually are marked
 *                        as required should be required
* @param   _markInvalid   optional parameter, to specify if not completed questions
*                         should be updated to be invalid (see isInvalid property)
 * @returns               true if the question and all its subquestions are complete
 *                        false if at least one (sub)question is not complete
 */
function recursivelyCheckCompleteness(_question, _onlyRequired, _markInvalid) {
    var areAllComplete = true;
    _question.forEach(function (question) {
        if (!question.readOnly && question.isEnabled) {
            if (question.subItems) {
                if (_markInvalid) {
                    var areSubItemsComplete = recursivelyCheckCompleteness(question.subItems, _onlyRequired, _markInvalid);
                    areAllComplete = areSubItemsComplete && areAllComplete;
                }
                else {
                    areAllComplete = (areAllComplete
                        ? recursivelyCheckCompleteness(question.subItems, _onlyRequired, _markInvalid)
                        : false);
                }
            }
            if (question.isEnabled && (question.required || !_onlyRequired) && question.type !== fhir_r4_1.QuestionnaireItemType.DISPLAY && question.type !== fhir_r4_1.QuestionnaireItemType.GROUP) {
                if (question.selectedAnswers === undefined || question.selectedAnswers.length === 0) {
                    if (_markInvalid)
                        question.isInvalid = true;
                    areAllComplete = false;
                }
            }
        }
    });
    return areAllComplete;
}
/**
* Recursively iterates through nested IQuestions and extracts the given answers and adds
* it to a given array as FHIR QuestionnaireResponseItem
* @param questions      an array of (possibly nested) IQuestions
* @param responseItems the array to fill with the FHIR QuestionnaireResponseItems
* @returns             the given array
* @throws              an error if answers are not valid
**/
function mapIQuestionToQuestionnaireResponseItem(_questions, _responseItems, _language) {
    _questions.forEach(function (question) {
        question.isInvalid = false;
        if (question.type === fhir_r4_1.QuestionnaireItemType.GROUP) {
            if (question.subItems && question.subItems.length > 0) {
                var labelText = question.label[_language];
                _responseItems.push({
                    linkId: question.id,
                    text: labelText ? labelText : undefined,
                    item: mapIQuestionToQuestionnaireResponseItem(question.subItems, [], _language)
                });
            }
            else {
                question.isInvalid = true;
                throw new Error("Invalid question set: IQuestion with id ".concat(question.id, " is group type, but has no subItems."));
            }
        }
        else if (question.isEnabled) {
            // some validation
            if (question.required && question.selectedAnswers.length === 0) {
                question.isInvalid = true;
                throw new Error("Invalid answer set: IQuestion with id ".concat(question.id, " is mandatory, but not answered."));
            }
            else if (!question.allowsMultipleAnswers && question.selectedAnswers.length > 1) {
                question.isInvalid = true;
                throw new Error("Invalid answer set: IQuestion with id ".concat(question.id, " allows only one answer, but has more."));
            }
            else {
                var responseItem_1 = {
                    linkId: question.id,
                    text: question.label[_language],
                    answer: new Array()
                };
                question.selectedAnswers.forEach(function (answer) {
                    if (answer.valueCoding) {
                        // find translated display for answer valueCoding
                        var answerDisplayAllLanguages = (question.answerOptions.find(function (answerOption) {
                            return answerOption.code.valueCoding && answer.valueCoding && answerOption.code.valueCoding.code === answer.valueCoding.code;
                        }) || { answer: '' }).answer;
                        // some answer options (e.g. zip code locations) have only one language set
                        var answerDisplay = answerDisplayAllLanguages
                            ? answerDisplayAllLanguages[_language]
                                ? answerDisplayAllLanguages[_language]
                                : answerDisplayAllLanguages[Object.keys(answerDisplayAllLanguages)[0]]
                            : '';
                        responseItem_1.answer.push({
                            valueCoding: {
                                system: answer.valueCoding.system,
                                code: answer.valueCoding.code,
                                display: answerDisplay,
                                extension: answer.valueCoding.extension
                            }
                        });
                    }
                    else {
                        responseItem_1.answer.push(answer);
                    }
                    if (question.subItems && question.subItems.length > 0) {
                        answer.item = [];
                        mapIQuestionToQuestionnaireResponseItem(question.subItems, answer.item, _language);
                    }
                });
                if (question.type === fhir_r4_1.QuestionnaireItemType.DISPLAY)
                    responseItem_1.answer = undefined;
                // add to array
                _responseItems.push(responseItem_1);
            }
        }
    });
    return _responseItems;
}
/*
* Checks if a item has a given extension, and returns the value of the extension (when one of the following:
*   - valueCodeableConcept
*   - valueDuration
*   - valueString
*   - valueInteger
*   - valueDate
*   - valueExpression
*   - valueBoolean (CAVE: when the valueBoolean is FALSE, the method will return FALSE!)
*   )
*   If the extension exists with another value, the method returns TRUE.
*   If the extension does not exist, the method returns UNDEFINED.
*/
function hasExtension(_extensionURL, _extensionSystem, _item) {
    var returnValue = undefined;
    if (_item.extension) {
        _item.extension.forEach(function (extension) {
            if (!returnValue && extension.url === _extensionURL) {
                if (_extensionSystem && extension.valueCodeableConcept && extension.valueCodeableConcept.coding) {
                    extension.valueCodeableConcept.coding.forEach(function (coding) {
                        if (coding.system === _extensionSystem) {
                            returnValue = coding;
                        }
                    });
                }
                if (extension.valueDuration && extension.valueDuration.system && extension.valueDuration.system === _extensionSystem) {
                    returnValue = extension.valueDuration;
                }
                if (extension.valueInteger != undefined) {
                    returnValue = extension.valueInteger;
                }
                if (extension.valueString) {
                    returnValue = extension.valueString;
                }
                if (extension.valueBoolean != undefined) {
                    returnValue = extension.valueBoolean;
                }
                if (extension.valueDate) {
                    returnValue = extension.valueDate;
                }
                if (extension.valueExpression && extension.valueExpression.language && extension.valueExpression.language === _extensionSystem) {
                    returnValue = extension.valueExpression;
                }
                return (returnValue != undefined
                    ? returnValue
                    : true);
            }
        });
    }
    return returnValue;
}
/**
 * Extracts IQuestionOptions from a QuestionnaireItem
 * @param _FHIRItem     the QuestionnaireItem to extract the options from
 * @returns             an IQuestionOptions object
 */
function setOptionsFromExtensions(_FHIRItem) {
    var _a;
    var calculatedExpressionExtension = hasExtension(CALCULATED_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem);
    var initialExpressionExtension = hasExtension(INITIAL_EXPRESSION_EXTENSION, 'text/fhirpath', _FHIRItem);
    var returnValue = {
        min: hasExtension(MIN_VALUE_EXTENSION, undefined, _FHIRItem),
        max: hasExtension(MAX_VALUE_EXTENSION, undefined, _FHIRItem),
        format: hasExtension(ENTRY_FORMAT_EXTENSION, undefined, _FHIRItem),
        sliderStep: hasExtension(SLIDER_STEP_VALUE_EXTENSION, undefined, _FHIRItem),
        unit: hasExtension(UNIT_EXTENSION, 'https://ucum.org', _FHIRItem),
        calculatedExpression: calculatedExpressionExtension ? calculatedExpressionExtension.expression : undefined,
        initialExpression: initialExpressionExtension ? initialExpressionExtension.expression : undefined,
        controlTypes: []
    };
    // push itemcontrol extensions to controlTypes
    (_a = _FHIRItem.extension) === null || _a === void 0 ? void 0 : _a.forEach(function (extension) {
        var _a;
        if (extension.url === ITEM_CONTROL_EXTENSION) {
            var controlType = (_a = extension.valueCodeableConcept) === null || _a === void 0 ? void 0 : _a.coding[0].code;
            controlType && returnValue.controlTypes.push(controlType);
        }
    });
    // TODO: legacy code, can be removed in version 1.0.0
    var itemControlExtension = hasExtension(ITEM_CONTROL_EXTENSION, ITEM_CONTROL_EXTENSION_SYSTEM, _FHIRItem);
    if (itemControlExtension) {
        Object.values(IQuestion_1.ItemControlType).forEach(function (typeCode) {
            if (!returnValue.controlType && itemControlExtension.code === typeCode) {
                returnValue.controlType = typeCode;
            }
        });
    }
    // TODO: end of legacy code
    return returnValue;
}
function recursivelyCheckTouched(item) {
    var _a;
    var touched = item.selectedAnswers.length > 0;
    (_a = item.subItems) === null || _a === void 0 ? void 0 : _a.forEach(function (subItem) {
        if (!touched) {
            touched = recursivelyCheckTouched(subItem);
        }
    });
    return touched;
}
function getAvailableLanguages(_questionnaire) {
    var _a, _b, _c;
    function extractFromExtensions(languageKeys, extensions) {
        extensions === null || extensions === void 0 ? void 0 : extensions.forEach(function (extension) {
            var _a;
            if (extension.url === LANGUAGE_EXTENSION) {
                (_a = extension.extension) === null || _a === void 0 ? void 0 : _a.forEach(function (subExtension) {
                    if (subExtension.url === 'lang') {
                        var languageValue = subExtension.valueCode;
                        if (languageValue) {
                            languageKeys[languageValue] = true;
                        }
                    }
                });
            }
        });
    }
    var languageKeys = {};
    extractFromExtensions(languageKeys, (_a = _questionnaire._title) === null || _a === void 0 ? void 0 : _a.extension);
    extractFromExtensions(languageKeys, (_b = _questionnaire._description) === null || _b === void 0 ? void 0 : _b.extension);
    _questionnaire.item && _questionnaire.item[0] && extractFromExtensions(languageKeys, (_c = _questionnaire.item[0]._text) === null || _c === void 0 ? void 0 : _c.extension);
    return Object.keys(languageKeys);
}
var QuestionnaireData = /** @class */ (function () {
    function QuestionnaireData(_questionnaire, _availableLanguages, _valueSets, _items, _hiddenFhirItems) {
        var _this = this;
        this.fhirQuestionnaire = _questionnaire;
        this.items = new Array();
        this.hiddenFhirItems = new Array();
        this.availableLanguages = _availableLanguages || getAvailableLanguages(_questionnaire);
        this.valueSets = {};
        if (_valueSets) {
            this.valueSets = _valueSets;
        }
        else if (this.fhirQuestionnaire.contained) {
            // process contained valuesets
            // TODO: prepare for not contained valuesets
            this.fhirQuestionnaire.contained.forEach(function (resource) {
                if (resource.resourceType === 'ValueSet') {
                    var valueSet = resource;
                    if (valueSet.id) {
                        _this.valueSets[valueSet.id] = valueSet;
                    }
                }
            });
        }
        if (_items) {
            this.items = _items;
            this.hiddenFhirItems = _hiddenFhirItems
                ? _hiddenFhirItems
                : [];
        }
        else {
            this.items = new Array();
            this.resetResponse();
        }
    }
    /**
     * Returns the storeable data of the object as a string, not including the questionnaire.
     * When rehydrating with a serialized QuestionnaireData string, you can create a new
     * QuestionnaireData object using the Questionnaire and then call .unserialize() on it,
     * passing the serialized string
     * @returns a string representing the QuestionnaireData object _without_ containing
     *              - the fhir Questionnaire
     * @see     unserialize()
     */
    QuestionnaireData.prototype.serialize = function () {
        return JSON.stringify({
            valueSets: this.valueSets,
            items: this.items,
            hiddenFhirItems: this.hiddenFhirItems,
            lastRestored: this.lastRestored,
            availableLanguages: this.availableLanguages,
            responseIdToSynchronize: this.responseIdToSynchronize
        });
    };
    /**
     * Populates the QuestionnaireData object with data from a previously serialized
     * QuestionnaireData Object. This can be either passed on as a string from serialize() or
     * as a JSON object that was created with JSON.stringify() from a QuestionnaireData
     * @param   _data   The serialized data from a QuestionnaireData as string or JSON
     * @throws          An error if the data is passed as a string with no items property
     *                  (which is used to detect if it is a serialized QuestionnaireData)
     * @see     serialize()
     */
    QuestionnaireData.prototype.unserialize = function (_data) {
        var data = typeof _data === 'string'
            ? JSON.parse(_data)
            : _data;
        if (!Object.prototype.hasOwnProperty.call(data, 'items')) {
            console.warn('Can not unserialize, passed string seems not to be a serialized QuestionnaireData.', data);
            throw new Error('Can not unserialize, passed string seems not to be a serialized QuestionnaireData.');
        }
        Object.assign(this, data);
        if (this.lastRestored) {
            this.lastRestored = new Date(this.lastRestored);
        }
    };
    /**
    * Resets the response to the questionnaire
    **/
    QuestionnaireData.prototype.resetResponse = function () {
        var _this = this;
        if (this.items.length > 0) {
            this.items = new Array();
        }
        this.hiddenFhirItems = new Array();
        var questionsDependencies = []; // helper array for dependingQuestions
        if (this.fhirQuestionnaire.item) {
            this.filterOutHiddenItems(this.fhirQuestionnaire.item).forEach(function (item) {
                // recursively process items
                var currentQuestion = _this.mapQuestionnaireItemToIQuestion(item);
                var dependingToQuestions = _this.linkDependingQuestions(item, currentQuestion);
                if (dependingToQuestions.length > 0) {
                    questionsDependencies = questionsDependencies.concat(dependingToQuestions);
                }
                _this.items.push(currentQuestion);
            });
            // now we stepped through all the items and the helper array is complete, we can add depending questions to their determinators
            questionsDependencies.forEach(function (question) {
                var determinator = _this.findQuestionById(question.id, _this.items);
                if (question.reference && determinator) {
                    var existingDependingQuestion = determinator.dependingQuestions.find(function (q) { return q.dependingQuestion == question.reference; });
                    if (existingDependingQuestion && question.answer !== undefined) {
                        existingDependingQuestion.criteria.push({
                            answer: question.answer,
                            operator: question.operator
                        });
                    }
                    else {
                        question.answer && determinator.dependingQuestions.push({
                            dependingQuestion: question.reference,
                            criteria: [{
                                    answer: question.answer,
                                    operator: question.operator
                                }]
                        });
                    }
                }
            });
        }
    };
    /**
    * Returns the questions array.
    **/
    QuestionnaireData.prototype.getQuestions = function () {
        return this.items;
    };
    /**
     * Updates the selected answer(s) of a question: adds the answer if it's not already selected
     * and removes it, if it was selected.
     * @param _question     the IQuestion to which the answer belongs
     * @param _answer       the selected / unselected QuestionnaireItemAnswerOption
     **/
    QuestionnaireData.prototype.updateQuestionAnswers = function (_question, _answer) {
        _question.isInvalid = false; // assume it is not invalid anymore, until further check
        if (_answer === undefined
            || (_question.type === fhir_r4_1.QuestionnaireItemType.INTEGER && _answer.code.valueInteger == undefined)
            || (_question.type === fhir_r4_1.QuestionnaireItemType.STRING && _answer.code.valueString == '')
            || (_question.type === fhir_r4_1.QuestionnaireItemType.TEXT && _answer.code.valueString == '')
            || (_question.type === fhir_r4_1.QuestionnaireItemType.DATE && _answer.code.valueDate == '')) {
            // remove previous given answers
            _question.selectedAnswers.splice(0, _question.selectedAnswers.length);
        }
        else {
            var indexOfAnswer = _question.selectedAnswers.indexOf(_answer.code);
            if (_question.allowsMultipleAnswers) {
                // check if item is already selected
                if (indexOfAnswer >= 0) { // answer is already selected
                    _question.selectedAnswers.splice(indexOfAnswer, 1); // remove answer
                }
                else {
                    // if not already selected, we select it now
                    _question.selectedAnswers.push(_answer.code);
                    // and disable other answers when necessary
                    if (_answer.disableOtherAnswers) {
                        _answer.disableOtherAnswers.forEach(function (otherAnswer) {
                            var indexOfOtherAnswer = _question.selectedAnswers.findIndex(function (selectedAnswer) {
                                return selectedAnswer.valueCoding
                                    ? selectedAnswer.valueCoding.code === otherAnswer
                                    : undefined;
                            });
                            if (indexOfOtherAnswer >= 0) { // otherAnswer is selected
                                _question.selectedAnswers.splice(indexOfOtherAnswer, 1); // remove otherAnswer)
                            } // no else needed, because we don't have to unselect already unselected answers
                        });
                    }
                }
            }
            else {
                if (indexOfAnswer < 0) {
                    _question.selectedAnswers[0] = _answer.code;
                }
            }
        }
        // we shouldn't have to do this in 2022, but if we don't vite will get confused and break everything
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var that = this;
        _question.dependingQuestions.forEach(function (dependingQuestion) {
            dependingQuestion.dependingQuestion.isEnabled = checkIfDependingQuestionIsEnabled(_question, dependingQuestion, _answer);
            // specification says that if an item is not enabled, every subitem is not enabled, 
            // no matter what their own enableWhen says
            if (dependingQuestion.dependingQuestion.isEnabled === false) {
                that.recursivelyDisableSubItems(dependingQuestion.dependingQuestion);
            }
            else {
                that.recursivelyEnableSubitems(dependingQuestion.dependingQuestion);
            }
        });
    };
    QuestionnaireData.prototype.recursivelyDisableSubItems = function (subItem) {
        var _this = this;
        var _a;
        subItem.isEnabled = false;
        (_a = subItem.subItems) === null || _a === void 0 ? void 0 : _a.forEach(function (sI) { return _this.recursivelyDisableSubItems(sI); });
    };
    QuestionnaireData.prototype.recursivelyEnableSubitems = function (subItem) {
        var _this = this;
        var _a, _b;
        subItem.isEnabled = true;
        var fhirItem = this.findFhirItem(subItem.id);
        (_a = fhirItem === null || fhirItem === void 0 ? void 0 : fhirItem.enableWhen) === null || _a === void 0 ? void 0 : _a.forEach(function (enableWhen) {
            var determinator = _this.findQuestionById(enableWhen.question);
            if (determinator) {
                var ewDefinition = determinator.dependingQuestions.find(function (dq) { return dq.dependingQuestion.id === subItem.id; });
                subItem.isEnabled = checkIfDependingQuestionIsEnabled(determinator, ewDefinition, { answer: {}, code: determinator.selectedAnswers[0] });
                // TODO: handle this for when parent item is a multiple choice item
            }
        });
        if (subItem.isEnabled)
            (_b = subItem.subItems) === null || _b === void 0 ? void 0 : _b.forEach(function (sI) { return _this.recursivelyEnableSubitems(sI); });
    };
    /**
    * Checks if a given IAnswerOption is already sel    ected for a IQuestion.
    * It is checking for the code of the IAnswerOption, not the display string.
    * @param _question     the IQuestion to which the answer belongs
    * @param _answer       the IAnswerOption in question
    **/
    QuestionnaireData.prototype.isAnswerOptionSelected = function (_question, _answer) {
        return _question.selectedAnswers.findIndex(function (selectedAnswer) {
            var _a, _b, _c, _d, _e;
            return (_answer.code.valueBoolean != undefined && selectedAnswer.valueBoolean === _answer.code.valueBoolean ||
                _answer.code.valueDate != undefined && selectedAnswer.valueDate === _answer.code.valueDate ||
                _answer.code.valueDateTime != undefined && selectedAnswer.valueDateTime === _answer.code.valueDateTime ||
                _answer.code.valueDecimal != undefined && selectedAnswer.valueDecimal === _answer.code.valueDecimal ||
                _answer.code.valueInteger != undefined && selectedAnswer.valueInteger === _answer.code.valueInteger ||
                _answer.code.valueQuantity != undefined && (((_a = selectedAnswer.valueQuantity) === null || _a === void 0 ? void 0 : _a.value) === _answer.code.valueQuantity.value &&
                    ((_b = selectedAnswer.valueQuantity) === null || _b === void 0 ? void 0 : _b.system) === _answer.code.valueQuantity.system ||
                    ((_c = selectedAnswer.valueQuantity) === null || _c === void 0 ? void 0 : _c.unit) === _answer.code.valueQuantity.unit) ||
                _answer.code.valueReference != undefined && selectedAnswer.valueReference === _answer.code.valueReference ||
                _answer.code.valueString != undefined && selectedAnswer.valueString === _answer.code.valueString ||
                _answer.code.valueTime != undefined && selectedAnswer.valueTime === _answer.code.valueTime ||
                _answer.code.valueUri != undefined && selectedAnswer.valueUri === _answer.code.valueUri ||
                _answer.code.valueAttachment != undefined && selectedAnswer.valueAttachment === _answer.code.valueAttachment ||
                _answer.code.valueCoding != undefined && (((_d = selectedAnswer.valueCoding) === null || _d === void 0 ? void 0 : _d.code) === _answer.code.valueCoding.code &&
                    ((_e = selectedAnswer.valueCoding) === null || _e === void 0 ? void 0 : _e.system) === _answer.code.valueCoding.system));
        }) > -1;
    };
    /**
    * Returns the questionnaire title in a given language.
    * Falls back to default language of the questionnaire,
    * if the wanted language is not available.
    * @param _language the language code of the wanted language.
    **/
    QuestionnaireData.prototype.getQuestionnaireTitle = function (_language) {
        var title = undefined;
        if (this.fhirQuestionnaire._title &&
            this.fhirQuestionnaire._title.extension &&
            this.availableLanguages.includes(_language)) {
            title = (0, fhir_r4_1.readI18N)(this.fhirQuestionnaire._title, _language);
        }
        return title || this.fhirQuestionnaire.title;
    };
    /**
    * Returns the questionnaire description in a given language.
    * Falls back to default language of the questionnaire,
    * if the wanted language is not available.
    * @param _language the language code of the wanted language.
    **/
    QuestionnaireData.prototype.getQuestionnaireDescription = function (_language) {
        var title = undefined;
        if (this.fhirQuestionnaire._description &&
            this.fhirQuestionnaire._description.extension &&
            this.availableLanguages.includes(_language)) {
            title = (0, fhir_r4_1.readI18N)(this.fhirQuestionnaire._description, _language);
        }
        return title || this.fhirQuestionnaire.description;
    };
    /**
    * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array. Existing answers are overwritten.
    * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire.
    * @throws an error if the questionnaire response is not matching the questionnaire
    **/
    QuestionnaireData.prototype.restoreAnswersFromQuestionnaireResponse = function (_fhirResponse) {
        var _this = this;
        var questionnaireUrl = _fhirResponse.questionnaire
            ? _fhirResponse.questionnaire.split('|')[0]
            : '';
        if (this.fhirQuestionnaire.url && questionnaireUrl !== this.fhirQuestionnaire.url.split('|')[0]) {
            throw new Error('Invalid argument: QuestionnaireResponse does not match Questionnaire!');
        }
        var recursivelyClearItems = function (_items) {
            _items.forEach(function (item) {
                item.selectedAnswers = [];
                if (item.subItems) {
                    recursivelyClearItems(item.subItems);
                }
            });
        };
        recursivelyClearItems(this.items);
        var answerMatchingIQuestionItemWithFhirResponseItem = function (_fhirItems) {
            _fhirItems.forEach(function (answerItem) {
                var item = _this.findQuestionById(answerItem.linkId, _this.items);
                if (item) {
                    item.selectedAnswers = [];
                    if (item.answerOptions !== undefined && answerItem.answer) {
                        answerItem.answer.forEach(function (answer) {
                            var answerAsAnswerOption = _this.findAccordingAnswerOption(answer, item.answerOptions);
                            if (answerAsAnswerOption) {
                                _this.updateQuestionAnswers(item, answerAsAnswerOption);
                            }
                            else {
                                item.selectedAnswers = answerItem.answer
                                    ? answerItem.answer
                                    : [];
                            }
                        });
                    }
                    else if (answerItem.answer && answerItem.answer.length > 0) {
                        if (item.allowsMultipleAnswers) {
                            item.selectedAnswers = answerItem.answer;
                        }
                        else {
                            item.selectedAnswers.push(answerItem.answer[0]);
                        }
                    }
                    if (answerItem.item) {
                        answerMatchingIQuestionItemWithFhirResponseItem(answerItem.item);
                    }
                }
                else {
                    console.warn('Item with linkId ' + answerItem.linkId + ' was found in QuestionnaireResponse, but does not exist in Questionnaire.');
                }
            });
        };
        // only restore, if it is not already up to date
        if (_fhirResponse.item && _fhirResponse.item.length > 0 &&
            (this.lastRestored == undefined || (_fhirResponse.authored && this.lastRestored < new Date(_fhirResponse.authored)))) {
            this.lastRestored = _fhirResponse.authored
                ? new Date(_fhirResponse.authored)
                : new Date();
            this.responseIdToSynchronize = _fhirResponse.id;
            answerMatchingIQuestionItemWithFhirResponseItem(_fhirResponse.item);
        }
    };
    /**
    * Gets the QuestionnaireResponse resource with all the currently set answers.
    * @param _language the shorthand for the language the QuestionnaireResponse (eg. 'de' or 'en'),
    *                  should be in the set of available languages
    * @param _options  Options object that can contain zero, one or many of the following properties:
    *                  - date:      the date when the Questionnaire was filled out (current date by default)
    *                  - includeID: boolean that determines if to include FHIR resource ID of a potential
    *                               previously restored QuestionnaireResponse (default: false) (if the previous response has
    *                               no id, the id of the generated response will be undefined)
    *                  - patient:   a Reference to the FHIR Patient who filled out the Questionnaire
    *                  - midataExtensions: wether to include MIDATA extensions or not (default: false)
    *                  - reset:     should the questionnaire be reseted after creating the response (default: false)
    * @returns         a QuestionnaireResponse FHIR resource containing all the answers the user gave
    * @throws          - an error if the QuestionnaireResponse is not valid for the corresponding
    *                  Questionnaire, e.g. when a required answer is missing
    *                  - an error if the _language given is not in the set of available languages
    **/
    QuestionnaireData.prototype.getQuestionnaireResponse = function (_language, _options) {
        var _this = this;
        if (!this.availableLanguages.includes(_language)) {
            throw new Error('getQuestionnaireResponse(): Provided _language (' +
                _language +
                ') is not supported by this Questionnaire. (Supported languages: ' + this.availableLanguages + ').');
        }
        var options = _options || {};
        // usual questionnaire response
        var fhirResponse = {
            resourceType: 'QuestionnaireResponse',
            status: this.isResponseComplete(true) ? fhir_r4_1.QuestionnaireResponseStatus.COMPLETED : fhir_r4_1.QuestionnaireResponseStatus.IN_PROGRESS,
            text: { status: fhir_r4_1.NarrativeStatus.GENERATED, div: '' },
            questionnaire: this.getQuestionnaireURLwithVersion(),
            authored: options.date ? options.date.toISOString() : new Date().toISOString(),
            source: options.patient,
            id: options.includeID ? this.responseIdToSynchronize : undefined,
            item: mapIQuestionToQuestionnaireResponseItem(this.items, new Array(), _language)
        };
        if (options.midataExtensions && this.fhirQuestionnaire.code) {
            fhirResponse.extension = [{
                    url: QUESTIONNAIRERESPONSE_CODING_EXTENSION_URL,
                    valueCoding: this.fhirQuestionnaire.code[0]
                }];
        }
        // stuff to do for hidden items with calculated expression
        var hiddenItemsWithCalculatedExpression = __spreadArray([], this.hiddenFhirItems, true).filter(function (i) { return i.item.options && i.item.options.calculatedExpression !== undefined; });
        hiddenItemsWithCalculatedExpression.forEach(function (item) {
            var _a, _b;
            if (item.item.options && item.item.options.calculatedExpression) {
                try {
                    var calculatedAnswer = {};
                    switch (item.item.type) {
                        case fhir_r4_1.QuestionnaireItemType.INTEGER:
                            calculatedAnswer = { valueInteger: fhirpath_1.default.evaluate(fhirResponse, item.item.options.calculatedExpression)[0] };
                            break;
                        case fhir_r4_1.QuestionnaireItemType.DECIMAL:
                            calculatedAnswer = { valueDecimal: fhirpath_1.default.evaluate(fhirResponse, item.item.options.calculatedExpression)[0] };
                            break;
                        case fhir_r4_1.QuestionnaireItemType.QUANTITY:
                            var initial = (_b = (_a = item.item.initial) === null || _a === void 0 ? void 0 : _a.find(function (i) { return i.valueQuantity != undefined; })) === null || _b === void 0 ? void 0 : _b.valueQuantity;
                            if (initial) {
                                calculatedAnswer = {
                                    valueQuantity: {
                                        value: fhirpath_1.default.evaluate(fhirResponse, item.item.options.calculatedExpression)[0],
                                        unit: initial.unit,
                                        system: initial.system,
                                        code: initial.code
                                    }
                                };
                            }
                            else {
                                console.warn('Calculated answer for item type QUANTITY needs an initial element for defining the unit.');
                            }
                            break;
                        default:
                            console.warn('Calculated answer for item type ' + item.item.type.toUpperCase() + ' is currently not implemented.', item.item);
                    }
                    if (item.item.allowsMultipleAnswers) {
                        item.item.selectedAnswers.push(calculatedAnswer);
                    }
                    else {
                        item.item.selectedAnswers = [calculatedAnswer];
                    }
                }
                catch (e) {
                    throw new Error('Can not evaluate fhirpath expression for item ' + item.item.id + ': ' + item.item.options.calculatedExpression + '.');
                }
            }
            if (item.parentLinkId) {
                var parentItem = _this.recursivelyFindId(item.parentLinkId, fhirResponse.item);
                if (parentItem) {
                    if (parentItem.item) {
                        parentItem.item.push(mapIQuestionToQuestionnaireResponseItem([item.item], new Array(), _language)[0]);
                    }
                    else {
                        parentItem.item = [mapIQuestionToQuestionnaireResponseItem([item.item], new Array(), _language)[0]];
                    }
                }
            }
            else {
                fhirResponse.item.push(mapIQuestionToQuestionnaireResponseItem([item.item], new Array(), _language)[0]);
            }
        });
        // generate narrative
        var narrativeDiv = '<div xmlns="http://www.w3.org/1999/xhtml">';
        // narrativeDiv    += '<style>' + 
        //                       '.question {font-weight: bold;} ' + 
        //                       'ul {margin: 0} ' + 
        //                       '.multiple-answers {display: inline; padding: 0} ' +
        //                       '.multiple-answers > li {display: inline; margin-left: 0.3em} ' +
        //                       '.multiple-answers > li:before {content: \'-\'; margin-right: 0.3em}' +
        //                    '</style>';
        narrativeDiv += '<h4 class="title">' + this.getQuestionnaireTitle(_language) + '</h4>';
        narrativeDiv += '<p class="status">Status: ' + fhirResponse.status + '</p>';
        narrativeDiv += '<p class="created">Created: ' + new Date(fhirResponse.authored).toLocaleDateString() + '</p>';
        narrativeDiv += '<p class="questionnaire-link">Questionnaire: ' + fhirResponse.questionnaire + '</p>';
        if (options.patient) {
            narrativeDiv += '<p class="patient">Patient: ' + (options.patient.display ? options.patient.display : options.patient.reference) + '</p>';
        }
        narrativeDiv += fhirResponse.item ? this.getNarrativeString(fhirResponse.item, true) : '';
        narrativeDiv += '</div>';
        fhirResponse.text = {
            status: fhir_r4_1.NarrativeStatus.GENERATED,
            div: narrativeDiv
        };
        fhirResponse.item = this.recursivelyCleanEmptyArrays(fhirResponse.item);
        if (options.reset) {
            this.resetResponse();
        }
        return __assign({}, fhirResponse);
    };
    /**
     * Recursively searches for a QuestionnaireResponseItem in a deep array.
     * @param id        the id of the item to find
     * @param items     the array of items
     * @returns         the QuestionnaireResponseItem if found, or undefined if no item matches
     */
    QuestionnaireData.prototype.recursivelyFindId = function (id, items) {
        var _this = this;
        var itemWithId;
        items.forEach(function (i) {
            if (!itemWithId) {
                if (i.linkId === id) {
                    itemWithId = i;
                }
                else if (i.item) {
                    itemWithId = _this.recursivelyFindId(id, i.item);
                }
            }
        });
        return itemWithId;
    };
    /**
     * Recursively removes empty arrays on item (because we don't want empty arrays in QuestionnaireResponses)
     * @param _items    the input array of items to iterate through
     * @returns         the deep cleaned input array, or undefined if the input array was empty
     */
    QuestionnaireData.prototype.recursivelyCleanEmptyArrays = function (_items) {
        var _this = this;
        if (_items !== undefined && _items.length > 0) {
            _items.forEach(function (item) {
                var _a;
                if (((_a = item.answer) === null || _a === void 0 ? void 0 : _a.length) === 0) {
                    // also throw out empty answer arrays
                    item.answer = undefined;
                }
                item.item = _this.recursivelyCleanEmptyArrays(item.item);
            });
            return _items;
        }
        else {
            return undefined;
        }
    };
    /**
     * Recursively generates the narrative html for QuestionnaireResponseItems.
     * @param _items      the items to be represented
     * @param _topLevel?  indicates if we are on the top level. do not set to true when calling recursively.
     * @returns           a string containging html code that represents the QuestionnaireResponseItems
     */
    QuestionnaireData.prototype.getNarrativeString = function (_items, _topLevel) {
        var _this = this;
        if (!_items || _items.length === 0)
            return '';
        var narrativeString = _topLevel
            ? '<ul class="narrative questionnaire-response">'
            : '<ul class="sub-question">';
        _items.map(function (i) { narrativeString += _this.getItemString(i); });
        return narrativeString + '</ul>';
    };
    /**
     * Recursively generates the narrative html for a single QuestionnaireResponseItem.
     * @param _item     the item
     * @returns         a string containging html code that represents the QuestionnaireResponseItem
     */
    QuestionnaireData.prototype.getItemString = function (_item) {
        var _a, _b;
        var parseAnswer = function (a) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            if (a.valueBoolean !== undefined)
                return a.valueBoolean;
            if (a.valueCoding !== undefined)
                return (((_a = a.valueCoding) === null || _a === void 0 ? void 0 : _a.display) || ((_b = a.valueCoding) === null || _b === void 0 ? void 0 : _b.code));
            if (a.valueDate !== undefined)
                return new Date(a.valueDate).toLocaleDateString();
            if (a.valueDateTime !== undefined)
                return new Date(a.valueDateTime).toLocaleString();
            if (a.valueTime !== undefined)
                return new Date(a.valueTime).toLocaleTimeString();
            if (a.valueDecimal !== undefined)
                return (_c = a.valueDecimal) === null || _c === void 0 ? void 0 : _c.toString();
            if (a.valueInteger !== undefined)
                return (_d = a.valueInteger) === null || _d === void 0 ? void 0 : _d.toString();
            if (a.valueQuantity !== undefined)
                return (((_e = a.valueQuantity) === null || _e === void 0 ? void 0 : _e.value) + ' ' + (((_f = a.valueQuantity) === null || _f === void 0 ? void 0 : _f.unit) ? (_g = a.valueQuantity) === null || _g === void 0 ? void 0 : _g.unit : (_h = a.valueQuantity) === null || _h === void 0 ? void 0 : _h.code));
            if (a.valueReference !== undefined)
                return (((_j = a.valueReference) === null || _j === void 0 ? void 0 : _j.display) ? (_k = a.valueReference) === null || _k === void 0 ? void 0 : _k.display : (_l = a.valueReference) === null || _l === void 0 ? void 0 : _l.reference);
            if (a.valueString !== undefined)
                return a.valueString;
            if (a.valueUri !== undefined)
                return a.valueUri;
            if (a.valueAttachment !== undefined)
                return 'Attachment ' + ((_m = a.valueAttachment) === null || _m === void 0 ? void 0 : _m.title);
        };
        if (!_item.answer) {
            if (_item.item && ((_a = _item.item) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                return (_item.text ? '<li><span class="question">' + _item.text + ':</span>' : '') + this.getNarrativeString(_item.item, false) + '</li>';
            }
            else {
                return '<li><span class="question display">' + (_item.text || 'no text') + '</span></li>';
            }
        }
        var itemString = _item.text ? '<li><span class="question">' + _item.text + ':</span>' : '';
        if (_item.answer.length === 0) {
            itemString += '<span class="response">-</span>';
        }
        else if (_item.answer.length === 1) {
            itemString += '<span class="response">' + parseAnswer(_item.answer[0]) + '</span>';
        }
        else {
            itemString += '<ul class="multiple-answers">';
            _item.answer.map(function (a) {
                itemString += '<li>' + parseAnswer(a) + '</li>';
            });
            itemString += '</ul>';
        }
        if (_item.item && ((_b = _item.item) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            itemString += this.getNarrativeString(_item.item, false);
        }
        itemString += '</li>';
        return itemString;
    };
    /**
    * Returns the questionnaire URL with version number in FHIR canonical format.
    * @return a canonical questionnaire URL, or an empty string if no URL is available
    **/
    QuestionnaireData.prototype.getQuestionnaireURLwithVersion = function () {
        if (!this.fhirQuestionnaire.url)
            return '';
        return this.fhirQuestionnaire.url + (this.fhirQuestionnaire.version
            ? ('|' + this.fhirQuestionnaire.version)
            : '');
    };
    /**
    * Checks a QuestionnaireResponse for completeness.
    * @param   _onlyRequired optional parameter, to specify if only questions with
    *          the required attribute need to be answered or all questions;
    *          default value is: false
    * @param   _markInvalid optional parameter, to specify if not completed questions
    *          should be updated to be invalid (see isInvalid property)
    *          default value is: true
    * @returns true if all questions are answered
    *          false if at least one answer is not answered
    */
    QuestionnaireData.prototype.isResponseComplete = function (_onlyRequired, _markInvalid) {
        _onlyRequired = _onlyRequired === true ? true : false;
        _markInvalid = _markInvalid == undefined ? true : _markInvalid;
        return recursivelyCheckCompleteness(this.items, _onlyRequired, _markInvalid);
    };
    /**
     * Determines if a question has an answer, when an answer is required. Also checks potential subquestions,
     * if these are activated.
     * @param _question      the question that should be checked
     * @param _markInvalid   optional parameter, indicates if the question (and subquestion) should be marked as invalid
     *                       if the question is not complete. defaults to true.
     * @returns              TRUE, if the question either does not require an answer, or does require and has at least one answer.
     *                       if the questions subquestions are activated and not complete, the parent question is also regarded incomplete
     *                       and thus FALSE is returned.
     */
    QuestionnaireData.prototype.isQuestionComplete = function (_question, _markInvalid) {
        return recursivelyCheckCompleteness([_question], true, _markInvalid === undefined ? true : _markInvalid);
    };
    /**
     * Determines if any question has been answered yet. Also checks subquestions, if activated.
     * @returns: TRUE, if at least one question has an answer
     *           FALSE, if all questions remain unanswered
     */
    QuestionnaireData.prototype.isTouched = function () {
        var touched = false;
        this.items.forEach(function (item) {
            if (!touched) {
                touched = recursivelyCheckTouched(item);
            }
        });
        return touched;
    };
    /**
    * recursively iterates through a possibly nested QuestionnaireItem and maps it to IQuestion objects.
    * @param _FHIRItem the QuestionnaireItem to start with
    */
    QuestionnaireData.prototype.mapQuestionnaireItemToIQuestion = function (_FHIRItem) {
        var _this = this;
        var _a;
        var question = {
            id: _FHIRItem.linkId ? _FHIRItem.linkId : '',
            required: _FHIRItem.required || false,
            prefix: _FHIRItem.prefix,
            allowsMultipleAnswers: _FHIRItem.repeats,
            answerOptions: new Array(),
            selectedAnswers: Array(),
            dependingQuestions: [],
            dependingQuestionsEnableBehaviour: _FHIRItem.enableBehavior,
            isEnabled: true,
            isInvalid: false,
            initial: _FHIRItem.initial,
            readOnly: _FHIRItem.readOnly ? _FHIRItem.readOnly : false,
            options: setOptionsFromExtensions(_FHIRItem)
        };
        // detect question type
        switch (_FHIRItem.type) {
            case fhir_r4_1.QuestionnaireItemType.GROUP:
            case fhir_r4_1.QuestionnaireItemType.DISPLAY:
            case fhir_r4_1.QuestionnaireItemType.BOOLEAN:
            case fhir_r4_1.QuestionnaireItemType.DECIMAL:
            case fhir_r4_1.QuestionnaireItemType.INTEGER:
            case fhir_r4_1.QuestionnaireItemType.DATE:
            case fhir_r4_1.QuestionnaireItemType.DATETIME:
            case fhir_r4_1.QuestionnaireItemType.TIME:
            case fhir_r4_1.QuestionnaireItemType.STRING:
            case fhir_r4_1.QuestionnaireItemType.TEXT:
            case fhir_r4_1.QuestionnaireItemType.CHOICE:
            case fhir_r4_1.QuestionnaireItemType.OPEN_CHOICE:
            case fhir_r4_1.QuestionnaireItemType.REFERENCE:
            case fhir_r4_1.QuestionnaireItemType.ATTACHMENT:
            case fhir_r4_1.QuestionnaireItemType.URL:
            case fhir_r4_1.QuestionnaireItemType.QUANTITY:
                question.type = _FHIRItem.type;
                break;
            default:
                console.warn("QuestionnaireData.ts: Item type ".concat(_FHIRItem.type, " is currently not supported."));
            //return undefined; // TODO : check this
        }
        var labels = {};
        this.availableLanguages.map(function (language) {
            labels[language] = _FHIRItem._text
                ? (0, fhir_r4_1.readI18N)(_FHIRItem._text, language) || _FHIRItem.text
                : _FHIRItem.text || '';
        });
        question.label = labels;
        // first handle group items with subitems
        if (_FHIRItem.item && _FHIRItem.item.length > 0) {
            question.subItems = new Array();
            _FHIRItem.item.forEach(function (subItem) {
                if (question.subItems) {
                    question.subItems.push(_this.mapQuestionnaireItemToIQuestion(subItem));
                }
            });
        }
        // handle the non-group items
        if (_FHIRItem.type !== fhir_r4_1.QuestionnaireItemType.GROUP) {
            if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.CHOICE) {
                // process answer options from ValueSet
                if (_FHIRItem.answerValueSet && _FHIRItem.answerValueSet.indexOf('#') >= 0) { // these are the "contained valuesets"
                    var answerOptionsToUnselect_1 = new Array();
                    var answerValueSet_1 = this.valueSets[_FHIRItem.answerValueSet.split('#')[1]];
                    // check if the valueset has an extension for items unselecting others
                    var unselectOtherExtensions_1;
                    if (_FHIRItem.extension) {
                        unselectOtherExtensions_1 = _FHIRItem.extension.filter(function (extension) {
                            return extension.url === UNSELECT_OTHERS_EXTENSION;
                        });
                    }
                    if (answerValueSet_1.compose && answerValueSet_1.compose.include[0].concept) {
                        var system_1 = answerValueSet_1.compose.include[0].system;
                        answerValueSet_1.compose.include[0].concept.forEach(function (concept) {
                            // build answerOption objects with translations
                            var answerOption = {
                                answer: concept.designation
                                    ? _this.getTranslationsFromDesignation(concept.designation)
                                    : _this.getFallbackTranslationStrings(concept.display || '?'),
                                code: {
                                    valueCoding: {
                                        system: system_1
                                            ? system_1
                                            : answerValueSet_1.url,
                                        code: concept.code
                                    }
                                }
                            };
                            if (unselectOtherExtensions_1) {
                                // prepare the unselect-others array when an answeroption unselects other options
                                unselectOtherExtensions_1.forEach(function (extension) {
                                    extension = extension.extension
                                        ? extension.extension[0]
                                        : { url: '' };
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding && extension.valueCode === answerOption.code.valueCoding.code && answerOption.code.valueCoding.code) {
                                        answerOptionsToUnselect_1.push({
                                            disabler: answerOption.code.valueCoding.code,
                                            toBeDisabled: { mustAllOthersBeDisabled: true }
                                        });
                                    }
                                    else if (answerOption.code.valueCoding) {
                                        if (answerOption.code.valueCoding.code && extension.valueCode) {
                                            answerOptionsToUnselect_1.push({
                                                disabler: answerOption.code.valueCoding.code,
                                                toBeDisabled: extension.valueCode
                                            });
                                        }
                                    }
                                });
                            }
                            if (question.answerOptions) {
                                question.answerOptions.push(answerOption);
                            }
                        });
                    }
                    // now we know all answerOptions, we can link the dependingAnswers from the temp array
                    answerOptionsToUnselect_1.forEach(function (answerPair) {
                        if (question.answerOptions) {
                            var disabler = question.answerOptions.find(function (answerOption) {
                                return answerOption.code.valueCoding && answerOption.code.valueCoding.code === answerPair.disabler;
                            });
                            var answersToBeDisabled_1 = new Array();
                            if (answerPair.toBeDisabled.mustAllOthersBeDisabled) {
                                // add all but the disabler option to array
                                question.answerOptions.map(function (answerOption) {
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding.code && answerOption.code.valueCoding.code !== answerPair.disabler) {
                                        answersToBeDisabled_1.push(answerOption.code.valueCoding.code);
                                    }
                                });
                            }
                            else {
                                answersToBeDisabled_1 = new Array();
                                // find the link to the disabled question
                                var disabledQuestion = question.answerOptions.find(function (answerOption) {
                                    return answerOption.code.valueCoding
                                        ? answerOption.code.valueCoding.code === answerPair.toBeDisabled
                                        : false;
                                });
                                if (disabledQuestion && disabledQuestion.code.valueCoding && disabledQuestion.code.valueCoding.code) {
                                    answersToBeDisabled_1.push(disabledQuestion.code.valueCoding.code);
                                }
                            }
                            // finally assign the to be disabled questions to the disabler
                            if (disabler) {
                                disabler.disableOtherAnswers = answersToBeDisabled_1;
                            }
                        }
                    });
                }
                else if (_FHIRItem.answerOption) {
                    // check if the valueset has an extension for items unselecting others
                    var unselectOtherExtensions_2;
                    if (_FHIRItem.extension) {
                        unselectOtherExtensions_2 = _FHIRItem.extension.filter(function (extension) {
                            return extension.url === UNSELECT_OTHERS_EXTENSION;
                        });
                    }
                    var answerOptionsToUnselect_2 = new Array();
                    question.answerOptions = _FHIRItem.answerOption.map(function (answerOption) {
                        var answerOptionText = {};
                        _this.availableLanguages.forEach(function (language) {
                            answerOptionText[language] = '';
                        });
                        if (answerOption.valueCoding) {
                            // check if we have multi-language support
                            if (answerOption.valueCoding._display && answerOption.valueCoding._display.extension) {
                                Object.keys(answerOptionText).forEach(function (key) {
                                    var _a, _b;
                                    var text = answerOption.valueCoding && answerOption.valueCoding._display
                                        ? (0, fhir_r4_1.readI18N)((_a = answerOption.valueCoding) === null || _a === void 0 ? void 0 : _a._display, key)
                                        : (_b = answerOption.valueCoding) === null || _b === void 0 ? void 0 : _b.display;
                                    answerOptionText[key] = text || '';
                                });
                            }
                            else { // when not, use the same text for every language
                                Object.keys(answerOptionText).forEach(function (key) {
                                    var _a, _b;
                                    answerOptionText[key] = ((_a = answerOption.valueCoding) === null || _a === void 0 ? void 0 : _a.display) || ((_b = answerOption.valueCoding) === null || _b === void 0 ? void 0 : _b.code) || '';
                                });
                            }
                            if (unselectOtherExtensions_2) {
                                // prepare the unselect-others array when an answeroption unselects other options
                                unselectOtherExtensions_2.forEach(function (extension) {
                                    extension = extension.extension
                                        ? extension.extension[0]
                                        : { url: '' };
                                    if (answerOption.valueCoding && answerOption.valueCoding && extension.valueCode === answerOption.valueCoding.code && answerOption.valueCoding.code) {
                                        answerOptionsToUnselect_2.push({
                                            disabler: answerOption.valueCoding.code,
                                            toBeDisabled: { mustAllOthersBeDisabled: true }
                                        });
                                    }
                                    else if (answerOption.valueCoding) {
                                        if (answerOption.valueCoding.code && extension.valueCode) {
                                            answerOptionsToUnselect_2.push({
                                                disabler: answerOption.valueCoding.code,
                                                toBeDisabled: extension.valueCode
                                            });
                                        }
                                    }
                                });
                            }
                        }
                        else {
                            ['valueString', 'valueDate', 'valueTime', 'valueInteger', 'valueReference'].forEach(function (valueX) {
                                if (answerOption[valueX]) {
                                    if (answerOption['_' + valueX]) {
                                        Object.keys(answerOptionText).forEach(function (key) {
                                            var text = (0, fhir_r4_1.readI18N)(answerOption['_' + valueX], key);
                                            answerOptionText[key] = text || answerOption[valueX];
                                        });
                                    }
                                    else {
                                        Object.keys(answerOptionText).forEach(function (key) {
                                            answerOptionText[key] = answerOption[valueX];
                                        });
                                    }
                                }
                            });
                        }
                        return {
                            answer: answerOptionText,
                            code: answerOption
                        };
                    });
                    // now we know all answerOptions, we can link the dependingAnswers from the temp array
                    answerOptionsToUnselect_2.forEach(function (answerPair) {
                        if (question.answerOptions) {
                            var disabler = question.answerOptions.find(function (answerOption) {
                                return answerOption.code.valueCoding && answerOption.code.valueCoding.code === answerPair.disabler;
                            });
                            var answersToBeDisabled_2 = new Array();
                            if (answerPair.toBeDisabled.mustAllOthersBeDisabled) {
                                // add all but the disabler option to array
                                question.answerOptions.map(function (answerOption) {
                                    if (answerOption.code.valueCoding && answerOption.code.valueCoding.code && answerOption.code.valueCoding.code !== answerPair.disabler) {
                                        answersToBeDisabled_2.push(answerOption.code.valueCoding.code);
                                    }
                                });
                            }
                            else {
                                answersToBeDisabled_2 = new Array();
                                // find the link to the disabled question
                                var disabledQuestion = question.answerOptions.find(function (answerOption) {
                                    return answerOption.code.valueCoding
                                        ? answerOption.code.valueCoding.code === answerPair.toBeDisabled
                                        : false;
                                });
                                if (disabledQuestion && disabledQuestion.code.valueCoding && disabledQuestion.code.valueCoding.code) {
                                    answersToBeDisabled_2.push(disabledQuestion.code.valueCoding.code);
                                }
                            }
                            // finally assign the to be disabled questions to the disabler
                            if (disabler) {
                                disabler.disableOtherAnswers = answersToBeDisabled_2;
                            }
                        }
                    });
                }
                else { // no answerValueSet available
                    console.warn('CHOICE question need answerOptions or an answerValueSet. No embedded answerValueSet found for ' + _FHIRItem.answerValueSet);
                }
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.INTEGER ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.DECIMAL ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.REFERENCE ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.DATE ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.DATETIME ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.TIME ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.TEXT ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.STRING ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.BOOLEAN ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.ATTACHMENT ||
                _FHIRItem.type === fhir_r4_1.QuestionnaireItemType.URL) {
                // these do not need preset answer options, so nothing to do here
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.DISPLAY) {
                question.readOnly = true;
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.QUANTITY) {
                if (question.options && question.options.controlType == IQuestion_1.ItemControlType.SLIDER && question.options.min !== undefined && question.options.max !== undefined) {
                    question.answerOptions = [
                        {
                            answer: {
                                // TODO: make dynamic
                                de: 'Wert mit Slider ausgewählt ($MIN$ - $MAX$)'.replace('$MIN$', question.options.min.toString()).replace('$MAX$', question.options.max.toString()),
                                fr: 'Valeur sélectionnée avec le slider ($MIN$ - $MAX$)'.replace('$MIN$', question.options.min.toString()).replace('$MAX$', question.options.max.toString())
                            },
                            code: {
                                valueQuantity: question.options.unit
                                    ? {
                                        value: undefined,
                                        system: question.options.unit.system,
                                        unit: question.options.unit.display,
                                        code: question.options.unit.code
                                    }
                                    : {}
                            }
                        }
                    ];
                }
                else {
                    // if (hasExtension(SLIDER_STEP_VALUE_EXTENSION, undefined, _FHIRItem) == undefined) {
                    //     console.warn('QuestionnaireData: Item type QUANTITY is currently only supported with slider extension', _FHIRItem);
                    // }
                }
            }
            else if (_FHIRItem.type === fhir_r4_1.QuestionnaireItemType.OPEN_CHOICE) {
                // nothing to do
            }
            else {
                console.warn('QuestionnaireData: Currently items of type ' + _FHIRItem.type + ' are not supported!', _FHIRItem);
            }
        }
        if (question.initial !== undefined) {
            if (question.allowsMultipleAnswers) {
                question.selectedAnswers = question.initial.filter(function (initialValue) { return question.type && _this.checkIfIsSameType(initialValue, question); });
            }
            else {
                var firstFittingAnswer = question.initial.find(function (initialValue) { return question.type && _this.checkIfIsSameType(initialValue, question); });
                if (firstFittingAnswer != undefined)
                    question.selectedAnswers = [firstFittingAnswer];
            }
        }
        if (question.type === fhir_r4_1.QuestionnaireItemType.CHOICE || question.type === fhir_r4_1.QuestionnaireItemType.OPEN_CHOICE) {
            var initialInFhir = (_a = _FHIRItem.answerOption) === null || _a === void 0 ? void 0 : _a.filter(function (ao) { return ao.initialSelected; }).map(function (item) {
                item.initialSelected = undefined;
                return item;
            });
            if (initialInFhir && initialInFhir.length > 0) {
                question.selectedAnswers = question.allowsMultipleAnswers
                    ? initialInFhir
                    : [initialInFhir[0]];
            }
        }
        return question;
    };
    /**
    * Removes QuestionnaireItems with the "hidden" extension from an array of QuestionnaireItem.
    * This runs on a copy of the array passed as an argument, so it won't affect the original array.
    * @param _FHIRItems the original items of a Questionnaire
    * @param _parent optional. when not passing all items of a Questionnaire (but only the subitems of an item),
    *                the parent of the items should be given so the questionnaireResponse can be built correctly.
    *                This is used mostly for recursive use of the function.
    * @returns a copy of the _FHIRItems array, but without the items that have the FHIR hidden extension (these will be
    *          kept track of in the hiddenFhirItems property).
    */
    QuestionnaireData.prototype.filterOutHiddenItems = function (_FHIRItems, _parent) {
        var _this = this;
        var returnArray = new Array();
        JSON.parse(JSON.stringify(_FHIRItems)).forEach(function (item) {
            if (item.item) {
                item.item = _this.filterOutHiddenItems(item.item, item);
            }
            var hasHidden = hasExtension(HIDDEN_EXTENSION, undefined, item);
            if (hasHidden) {
                _this.hiddenFhirItems.push({
                    item: _this.mapQuestionnaireItemToIQuestion(item),
                    parentLinkId: _parent ? _parent.linkId : undefined
                });
            }
            else {
                returnArray.push(item);
            }
        });
        return returnArray;
    };
    /**
     *
     * @param _FHIRItem
     * @param _currentQuestion
     * @returns                 An array of objects describing the depending questions.
     */
    QuestionnaireData.prototype.linkDependingQuestions = function (_FHIRItem, _currentQuestion) {
        var _this = this;
        var dependingQuestions = new Array();
        if (_FHIRItem.item && _FHIRItem.item.length > 0) {
            _FHIRItem.item.forEach(function (item, index) {
                if (_currentQuestion.subItems) {
                    dependingQuestions = dependingQuestions.concat(_this.linkDependingQuestions(item, _currentQuestion.subItems[index]));
                }
            });
        }
        if (_FHIRItem.enableWhen) {
            _currentQuestion.isEnabled = false;
            _FHIRItem.enableWhen.forEach(function (determinator) {
                var dependingObject = {
                    id: determinator.question,
                    reference: _currentQuestion,
                    operator: determinator.operator,
                    answer: undefined
                };
                switch (determinator.operator) {
                    case fhir_r4_1.QuestionnaireItemOperator.EXISTS:
                        if (determinator.answerBoolean != undefined) {
                            dependingObject.answer = { valueBoolean: determinator.answerBoolean };
                            var dependant = _this.findQuestionById(determinator.question);
                            if (dependant) {
                                _currentQuestion.isEnabled = (dependant.selectedAnswers.length > 0) === determinator.answerBoolean;
                            }
                        }
                        else {
                            console.warn("QuestionnaireData.ts: Depending questions with operator EXISTS needs answerBoolean (Question ".concat(_FHIRItem.linkId, ")"));
                        }
                        break;
                    case fhir_r4_1.QuestionnaireItemOperator.NE:
                    case fhir_r4_1.QuestionnaireItemOperator.E:
                        if (determinator.answerString) {
                            dependingObject.answer = { valueString: determinator.answerString };
                        }
                        else if (determinator.answerCoding) {
                            dependingObject.answer = { valueCoding: determinator.answerCoding };
                        }
                        else if (determinator.answerDecimal) {
                            dependingObject.answer = { valueDecimal: determinator.answerDecimal };
                        }
                        else if (determinator.answerInteger) {
                            dependingObject.answer = { valueInteger: determinator.answerInteger };
                        }
                        else if (determinator.answerDate) {
                            dependingObject.answer = { valueDate: determinator.answerDate };
                        }
                        else if (determinator.answerDateTime) {
                            dependingObject.answer = { valueDateTime: determinator.answerDateTime };
                        }
                        else if (determinator.answerTime) {
                            dependingObject.answer = { valueTime: determinator.answerTime };
                        }
                        else if (determinator.answerBoolean != undefined) {
                            dependingObject.answer = { valueBoolean: determinator.answerBoolean };
                        }
                        else {
                            console.warn("QuestionnaireData.ts: Currently only answerCoding, answerString, answerDecimal, answerInteger, answerDate, answerDateTime, answerBoolean and answerTime are supported for depending questions with operators \"=\" and \"!=\" (Question ".concat(_FHIRItem.linkId, ")"));
                        }
                        break;
                    case fhir_r4_1.QuestionnaireItemOperator.GT:
                    case fhir_r4_1.QuestionnaireItemOperator.LT:
                    case fhir_r4_1.QuestionnaireItemOperator.GE:
                    case fhir_r4_1.QuestionnaireItemOperator.LE:
                        if (determinator.answerDecimal) {
                            dependingObject.answer = { valueDecimal: determinator.answerDecimal };
                        }
                        else if (determinator.answerInteger) {
                            dependingObject.answer = { valueInteger: determinator.answerInteger };
                        }
                        else if (determinator.answerDate) {
                            dependingObject.answer = { valueDate: determinator.answerDate };
                        }
                        else if (determinator.answerDateTime) {
                            dependingObject.answer = { valueDateTime: determinator.answerDateTime };
                        }
                        else if (determinator.answerTime) {
                            dependingObject.answer = { valueTime: determinator.answerTime };
                        }
                        else {
                            console.warn("QuestionnaireData.ts: Currently only answerDecimal, answerInteger, answerDate, answerDateTime and answerTime are supported for depending questions with operators \"<\", \">\", \">=\" and \">=\" (Question ".concat(_FHIRItem.linkId, ")"));
                        }
                        break;
                }
                if (dependingObject.answer) {
                    dependingQuestions.push(dependingObject);
                }
            });
        }
        return dependingQuestions;
    };
    /**
    * Populates the questions with initialExpression FHIRPath extensions with data from given resources.
    * The FHIRPath resources need to specify the needed resource type with %type as first node of the FHIRPath
    * expressions (e.g. '%patient.name.given.first()').
    * @param _resources     array of resources used to populate the answers (e.g. Patient resource). Each resource
    *                       type can only be in the array once.
    * @param _overWriteExistingAnswers (optional) specifies if existing answers should be overwritten (default: false)
    */
    QuestionnaireData.prototype.populateAnswers = function (_resources, _overWriteExistingAnswers) {
        var _this = this;
        var resources = {};
        _resources.forEach(function (r) {
            if (r.resourceType) {
                resources[r.resourceType.toLowerCase()] = r;
            }
        });
        var recursivelyPopulate = function (_items) {
            _items.forEach(function (item) {
                if (item.subItems) {
                    recursivelyPopulate(item.subItems);
                }
                if ((_overWriteExistingAnswers || item.selectedAnswers.length === 0) && item.options && item.options.initialExpression) {
                    var expression = item.options.initialExpression;
                    if (expression.indexOf('%') == -1) {
                        console.warn('QuestionnaireData: Can not populate with initialExpression for item ' + item.id + ': initialExpression does not specify context variable (' + expression + ')');
                    }
                    else {
                        var type = expression.split('.')[0].substring(1).toLowerCase();
                        var resource = resources[type];
                        if (resource) {
                            var cleanExpression = expression.replace(new RegExp('%' + type + '.', 'g'), '');
                            var value_1 = fhirpath_1.default.evaluate(resource, cleanExpression)[0];
                            if (value_1 != undefined) {
                                var populatedAnswer_1 = { answer: {}, code: {} };
                                _this.availableLanguages.forEach(function (l) {
                                    populatedAnswer_1.answer[l] = value_1;
                                });
                                switch (item.type) {
                                    case fhir_r4_1.QuestionnaireItemType.CHOICE:
                                        populatedAnswer_1 = _this.findAccordingAnswerOption(value_1, item.answerOptions) || populatedAnswer_1;
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.STRING:
                                    case fhir_r4_1.QuestionnaireItemType.TEXT:
                                        populatedAnswer_1.code.valueString = value_1.toString();
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.INTEGER:
                                        populatedAnswer_1.code.valueInteger = Number(value_1);
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.BOOLEAN:
                                        populatedAnswer_1.code.valueBoolean = typeof value_1 === 'string'
                                            ? value_1.toLowerCase() === 'true'
                                            : value_1;
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.DATE:
                                        populatedAnswer_1.code.valueDate = value_1.toString();
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.DATETIME:
                                        populatedAnswer_1.code.valueDateTime = value_1.toString();
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.DECIMAL:
                                        populatedAnswer_1.code.valueDecimal = Number(value_1);
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.QUANTITY:
                                        populatedAnswer_1.code.valueQuantity = {
                                            value: Number(value_1.split(' ')[0]),
                                            unit: value_1.split(' ')[1]
                                        };
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.TIME:
                                        populatedAnswer_1.code.valueTime = value_1.toString();
                                        break;
                                    case fhir_r4_1.QuestionnaireItemType.REFERENCE:
                                        populatedAnswer_1.code.valueReference = {
                                            reference: value_1.toString()
                                        };
                                        break;
                                    default:
                                        console.warn('Population of items of type' + item.type + ' is currently not supported by QuestionnaireData. Please inform the developer or create an issue on Github with specifying the missing type.');
                                }
                                if (Object.keys(populatedAnswer_1.code).length > 0) {
                                    _this.updateQuestionAnswers(item, populatedAnswer_1);
                                }
                            }
                        }
                        else {
                            console.warn('QuestionnaireData: Can not populate with initialExpression for item ' + item.id + ': Missing context resource of type ' + type);
                        }
                    }
                }
            });
        };
        recursivelyPopulate(this.items);
    };
    /**
    * Finds the answerOption that matches a criterium, so on choice question, populated answers are exactly like the answer option.
    * AnswerOptions of type valueAttachment can't be found like that.
    * @param criterium      Can be just a string, or a QuestionnaireResponseItemAnswer. Defines which answer option should be found
    * @param answerOptions  The answerOptions of an item, array that will be searched.
    **/
    QuestionnaireData.prototype.findAccordingAnswerOption = function (criterium, answerOptions) {
        return answerOptions.find(function (answerOption) {
            var foundIt = false;
            // first check the primitive types
            PRIMITIVE_VALUE_X.forEach(function (valueX) {
                if (!foundIt) {
                    var comparator = typeof criterium === 'string'
                        ? criterium
                        : criterium[valueX];
                    if (comparator && answerOption.code[valueX]) {
                        foundIt = answerOption.code[valueX].toString() === comparator.toString();
                    }
                }
            });
            // if not sucessful, check the complex types
            COMPLEX_VALUE_X.forEach(function (valueX) {
                if (!foundIt) {
                    var comparator = criterium;
                    if (typeof criterium === 'string') {
                        // we just assume the string has the matching code system / unit / whatever for the complex type.
                        comparator = JSON.parse(JSON.stringify(answerOption.code));
                        if (comparator.valueCoding) {
                            comparator.valueCoding.code = criterium;
                        }
                        if (comparator.valueQuantity) {
                            comparator.valueQuantity.value = Number(criterium);
                        }
                        if (comparator.valueReference) {
                            comparator.valueReference.reference = criterium;
                        }
                    }
                    foundIt = valueX.isMatching(comparator, answerOption);
                }
            });
            return foundIt;
        });
    };
    /**
     * Checks if an initial value is valid for a given question
     * @param initial   the initial value from the FHIR questionnaire
     * @param item      the IQuestion with the value
     * @returns         TRUE, if the initial value has a value[x] of the correct type of the
     *                  item, FALSE if not, or if it is a choice question with answerOptions
     */
    QuestionnaireData.prototype.checkIfIsSameType = function (initial, item) {
        switch (item.type) {
            case fhir_r4_1.QuestionnaireItemType.BOOLEAN: return initial.valueBoolean != undefined;
            case fhir_r4_1.QuestionnaireItemType.DECIMAL: return initial.valueDecimal != undefined;
            case fhir_r4_1.QuestionnaireItemType.INTEGER: return initial.valueInteger != undefined;
            case fhir_r4_1.QuestionnaireItemType.DATE: return initial.valueDate != undefined;
            case fhir_r4_1.QuestionnaireItemType.DATETIME: return initial.valueDateTime != undefined;
            case fhir_r4_1.QuestionnaireItemType.TIME: return initial.valueTime != undefined;
            case fhir_r4_1.QuestionnaireItemType.STRING: return initial.valueString != undefined;
            case fhir_r4_1.QuestionnaireItemType.TEXT: return initial.valueTime != undefined;
            case fhir_r4_1.QuestionnaireItemType.URL: return initial.valueUri != undefined;
            case fhir_r4_1.QuestionnaireItemType.ATTACHMENT: return initial.valueAttachment != undefined;
            case fhir_r4_1.QuestionnaireItemType.QUANTITY: return initial.valueQuantity != undefined;
            case fhir_r4_1.QuestionnaireItemType.CHOICE:
            case fhir_r4_1.QuestionnaireItemType.OPEN_CHOICE:
                if (item.answerOptions && item.answerOptions.length > 0) {
                    console.warn('When answerOptions are available, you should use answerOption.initialSelected instead of initialValue. (Question ' + item.id + ')');
                    return false;
                }
                else {
                    return (initial.valueInteger != undefined ||
                        initial.valueDate != undefined ||
                        initial.valueString != undefined ||
                        initial.valueCoding != undefined ||
                        initial.valueReference != undefined);
                }
            default: return false;
        }
    };
    /**
    * Recursively searches for a IQuestion by ID. This is useful if a Questionnaires questions
    * are nested on multiple layers.
    * @param _id    the id of the IQuestion to find
    * @param _data? the (nested) array of IQuestion to search in. If no data is provided, search is
    *               performed over all questions of the QuestionnaireData
    */
    QuestionnaireData.prototype.findQuestionById = function (_id, _data) {
        var _this = this;
        if (_data === void 0) { _data = this.getQuestions(); }
        var result = undefined;
        _data.forEach(function (question) {
            if (!result) {
                if (question.id === _id) {
                    result = question;
                }
                else if (question.subItems) {
                    result = _this.findQuestionById(_id, question.subItems);
                }
            }
        });
        return result;
    };
    /**
     * Gets translations from designation like in an embedded valueset.
     * @param languageDesignations  the designations from the valueset
     * @returns                     an object key/value pair with the languages
     *                              and the matching strings
     */
    QuestionnaireData.prototype.getTranslationsFromDesignation = function (languageDesignations) {
        var translations = {};
        Array.prototype.forEach.call(languageDesignations, function (designation) {
            translations[designation.language] = designation.value;
        });
        return translations;
    };
    /**
     * Creates a fallback I18N object with a string for when no I18N is available. All available languages will have
     * the same, fallback, translation string
     * @param _text     the fallback string
     * @returns         an object key/value pair with each available language having set the translation string
     */
    QuestionnaireData.prototype.getFallbackTranslationStrings = function (_text) {
        var returnObject = {};
        this.availableLanguages.forEach(function (lang) {
            returnObject[lang] = _text;
        });
        return returnObject;
    };
    /**
     * Searches for the QuestionnaireItem in the FHIR Questionnaire
     * @param id        the id of the item to find
     * @param subItems  optional (for recursivitiy): an array to search in
     * @returns         the QuestionnaireItem, or undefined if no item can be found
     */
    QuestionnaireData.prototype.findFhirItem = function (id, subItems) {
        var _this = this;
        var found;
        var searchArray = subItems || this.fhirQuestionnaire.item;
        searchArray === null || searchArray === void 0 ? void 0 : searchArray.forEach(function (item) {
            if (!found) {
                if (item.linkId === id) {
                    found = item;
                }
                if (item.item) {
                    found = _this.findFhirItem(id, item.item);
                }
            }
        });
        return found;
    };
    return QuestionnaireData;
}());
exports.QuestionnaireData = QuestionnaireData;
//# sourceMappingURL=QuestionnaireData.js.map