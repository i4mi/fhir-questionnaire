<template>
  <div
    v-if="question.isEnabled"
    :class="'question ' + 'question-' + question.type + (question.isInvalid ? ' invalid' : '')">
    <h2>
      {{ (question.prefix ? question.prefix + ': ' : '') + question.label[language] }}
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

    <!-- SUB Questions-->
    <div v-if="question.subItems && question.subItems.length > 0">
      <QuestionComponent
        v-for="subquestion of question.subItems"
        :question="subquestion"
        :key="subquestion.id"
        :isSelected="isSelected"
        :onAnswer="onAnswer"
        language="language" />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'QuestionComponent',
  data() {
    return {};
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
  methods: {}
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
  border-left: solid 3px #d73e2e;
  border-radius: 3px;
  background-color: #533;
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
</style>
