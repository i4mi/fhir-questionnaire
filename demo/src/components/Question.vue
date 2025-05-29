<template>
  <div
    v-if="question.isEnabled"
    :class="'question ' + 'question-' + question.type + (question.isInvalid ? ' invalid' : '')">
    <h2>
      {{ (question.prefix ? question.prefix + ': ' : '') + question.label[language] + (question.required ? '*' : '') }}
    </h2>
    <!-- CHOICE Question -->
    <ul v-if="question.type === 'choice'">
      <li
        v-for="answer in question.answerOptions"
        :key="question.id + '-' + answer.code"
        @click="onAnswer(question, answer)">
        <input
          :type="question.allowsMultipleAnswers ? 'checkbox' : 'radio'"
          :checked="isSelected(question, answer)"
          :name="question.id"
          :id="answer.code.toString()" />
        <label for="answer.code.toString()">{{ answer.answer[language] }}</label>
      </li>
    </ul>
    <!-- STRING | DECIMAL Question -->
    <input
      v-if="question.type === 'string' || question.type === 'decimal'"
      v-model="value"
      @change="updateValue(value, question.type)" />

    <!-- INTEGER Question -->
    <input
      v-if="question.type === 'integer'"
      v-model="value"
      type="number"
      @change="updateValue(value, question.type)" />

    <!-- DATE Question -->
    <input
      v-if="question.type === 'date'"
      v-model="value"
      type="date"
      @change="updateValue(value, question.type)" />

    <!-- QUANTITY Question-->
    <!-- with SLIDER-->
    <div
      class="slider-container"
      v-if="question.type === 'quantity' && question.options?.controlType == 'slider'">
      <span class="value-label"
        >{{ value }} {{ value && question.options.unit?.code ? question.options.unit.code : '' }}</span
      >
      <div class="slider">
        <span>{{ question.options.min }}</span>
        <input
          type="range"
          v-model="value"
          :step="question.options.sliderStep"
          :min="question.options.min !== undefined ? question.options.min : 0"
          :max="question.options.max !== undefined ? question.options.max : 100"
          @change="updateValue(Number(value), question.type)" />
        <span>{{ question.options.max }}</span>
      </div>
    </div>
    <!-- with INPUT-->
    <div v-if="question.type === 'quantity' && question.options?.controlType != 'slider'">
      <input
        v-model="value"
        :min="question.options.min"
        :max="question.options.max"
        type="number"
        @change="updateValue(value, question.type)" />
      <span v-if="question.options.unit?.code">&nbsp;{{ question.options.unit.code }}</span>
    </div>

    <!-- TEXT Question -->
    <textarea
      v-if="question.type === 'text'"
      v-model="value"
      @change="updateValue(value, question.type)">
    </textarea>

    <!-- BOOLEAN Question -->
    <input
      v-if="question.type === 'boolean'"
      type="checkbox"
      v-model="booleanValue"
      @change="updateValue(booleanValue, question.type)" />

    <!-- SUB Questions-->
    <div v-if="question.subItems && question.subItems.length > 0">
      <QuestionComponent
        v-for="subquestion of question.subItems"
        :question="subquestion"
        :key="subquestion.id"
        :isSelected="isSelected"
        :onAnswer="onAnswer"
        :language="language" />
    </div>
  </div>
</template>

<script lang="ts">
import {QuestionnaireItemType} from '@i4mi/fhir_r4';
import {defineComponent} from 'vue';
import type {IAnswerOption} from '@i4mi/fhir_questionnaire';

export default defineComponent({
  name: 'QuestionComponent',
  data() {
    return {
      value: '' as string | number,
      booleanValue: false
    };
  },
  props: {
    question: {
      type: Object, // as PropType<IQuestion>,
      required: true
    },
    onAnswer: {
      type: Function, //as PropType<(q: IQuestion, a: IAnswerOption) => void>,
      required: true
    },
    isSelected: {
      type: Function, // as PropType<(q: IQuestion, a: IAnswerOption) => boolean>,
      required: true
    },
    language: {
      type: String,
      required: true
    }
  },
  mounted() {
    switch (this.question.type) {
      case QuestionnaireItemType.DATE:
        if (this.question.selectedAnswers.length > 0) {
          this.value = this.question.selectedAnswers[0].valueDate || '';
        }
        break;
      case QuestionnaireItemType.STRING:
      case QuestionnaireItemType.TEXT:
        if (this.question.selectedAnswers.length > 0) {
          this.value = this.question.selectedAnswers[0].valueString || '';
        }
        break;
      case QuestionnaireItemType.INTEGER:
        if (this.question.selectedAnswers.length > 0) {
          this.value = this.question.selectedAnswers[0].valueInteger || '';
        }
        break;
      case QuestionnaireItemType.DECIMAL:
        if (this.question.selectedAnswers.length > 0) {
          this.value = this.question.selectedAnswers[0].valueDecimal || '';
        }
        break;
      case QuestionnaireItemType.BOOLEAN:
        if (this.question.selectedAnswers.length > 0) {
          this.booleanValue = this.question.selectedAnswers[0].valueBoolean;
        }
        break;
      case QuestionnaireItemType.CHOICE:
      // nothing to do because for choice the display value is directly calculated
    }
  },
  methods: {
    updateValue(value: string | number | boolean, type: QuestionnaireItemType) {
      const answer: IAnswerOption = {
        answer: {},
        code: {}
      };
      switch (type) {
        case QuestionnaireItemType.STRING:
        case QuestionnaireItemType.TEXT: {
          answer.answer[this.language] = value as string;
          answer.code.valueString = value as string;
          break;
        }
        case QuestionnaireItemType.QUANTITY: {
          answer.answer[this.language] = value as string;
          answer.code.valueQuantity = {
            value: value as number,
            code: this.question.options.unit.value,
            system: this.question.options.unit.system,
            unit: this.question.options.unit.display
          };
          break;
        }
        case QuestionnaireItemType.DECIMAL: {
          answer.answer[this.language] = value as string;
          answer.code.valueDecimal = value as number;
          break;
        }
        case QuestionnaireItemType.INTEGER: {
          answer.answer[this.language] = value as string;
          answer.code.valueInteger = value as number;
          break;
        }
        case QuestionnaireItemType.BOOLEAN: {
          answer.answer[this.language] = value as string;
          answer.code.valueBoolean = value as boolean;
          break;
        }
        case QuestionnaireItemType.DATE: {
          const date = new Date(value as string);
          answer.answer[this.language] = date.toLocaleTimeString();
          answer.code.valueDate = date.toISOString();
          break;
        }
        default: {
          console.log('Item type ' + type + ' is not yet implemented.');
        }
      }
      this.onAnswer(this.question, answer);
    }
  }
});
</script>

<style scoped>
.question {
  border-left: solid 1px white;
  border-radius: 1px;
  padding: 0.3em 0.5em;
  margin-bottom: 0.5em;
}
.question-display {
  border-left: unset;
}
.question h2 {
  font-size: 1em;
  line-height: 1.2em;
  font-weight: bold;
  margin: 0;
}

.question.invalid {
  border-left: solid 3px #f26419;
  border-radius: 3px;
  background-color: #f6ae2d;
}

.question-display h2 {
  font-weight: normal;
}

.question-choice ul {
  list-style: none;
  padding-left: 0.5em;
}
.question-choice li {
  cursor: pointer;
  margin-bottom: 0.5em;
}
.question-choice input {
  cursor: pointer;
}
.question-choice label {
  margin-left: 0.5em;
  cursor: pointer;
}
.slider-container {
  width: 30em;
  .value-label {
    display: inline-block;
    width: 100%;
    text-align: center;
  }
  input {
    width: calc(100% - 6em);
  }
  span {
    width: 2em;
    display: inline-block;
    text-align: center;
  }
}
</style>
