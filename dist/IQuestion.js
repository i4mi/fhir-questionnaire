"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemControlType = void 0;
// see https://www.hl7.org/fhir/valueset-questionnaire-item-control.html
var ItemControlType;
(function (ItemControlType) {
    // for question
    ItemControlType["AUTO_COMPLETE"] = "autocomplete";
    ItemControlType["DROP_DOWN"] = "drop-down";
    ItemControlType["CHECK_BOX"] = "check-box";
    ItemControlType["LOOK_UP"] = "lookup";
    ItemControlType["RADIO_BUTTON"] = "radio-button";
    ItemControlType["SLIDER"] = "slider";
    ItemControlType["SPINNER"] = "spinner";
    ItemControlType["TEXT_BOX"] = "text-box";
    // for group
    ItemControlType["LIST"] = "list";
    ItemControlType["TABLE"] = "table";
    ItemControlType["HORIZONTAL_ANSWER_TABLE"] = "htable";
    ItemControlType["GROUP_TABLE"] = "gtable";
    ItemControlType["ANSWER_TABLE"] = "atable";
    ItemControlType["HEADER"] = "header";
    ItemControlType["FOOTER"] = "footer";
    // for text
    ItemControlType["INLINE"] = "inline";
    ItemControlType["PROMPT"] = "prompt";
    ItemControlType["UNIT"] = "unit";
    ItemControlType["LOWER_BOUND"] = "lower";
    ItemControlType["UPPER_BOUND"] = "upper";
    ItemControlType["FLY_OVER"] = "flyover";
    ItemControlType["HELP_BUTTON"] = "help";
})(ItemControlType = exports.ItemControlType || (exports.ItemControlType = {}));
//# sourceMappingURL=IQuestion.js.map