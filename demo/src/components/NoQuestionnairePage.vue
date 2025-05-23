<template>
  <p>
    This is a small demo app for the
    <a href="https://i4mi.github.io/fhir-questionnaire/">@i4mi/fhir-questionnaire library</a>.
  </p>
  <h2>No questionnaire selected</h2>
  <p>You can select one of the example questionnaires, or use your own Questionnaire resource.</p>
  <ul>
    <li
      v-for="q of questionnaires"
      :key="q.name"
      @click="() => onSelect(q.name)">
      <h3>{{ q.name }}</h3>
      <p>{{ q.description }}</p>
    </li>
  </ul>
</template>

<script lang="ts">
import {defineComponent} from 'vue';

export default defineComponent({
  name: 'NoQuestionnairePage',
  data() {
    return {};
  },
  props: {
    questionnaires: {
      type: Object,
      required: true
    },
    onSelect: {
      type: Function,
      required: true
    }
  },
  mounted() {},
  methods: {}
});
</script>

<style scoped>
ul {
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
}
li {
  list-style-type: none;
  color: #2F4858;
  display: inline-block;
  margin: 0.5em;
  border: 1px solid #2F4858;
  border-radius: 2px;
  padding: 0.5em;
  width: 20em;
  h3 {
    margin: 0;
  }
  p {
    margin-bottom: 0;
  }
}
li:hover {
  cursor: pointer;
  border-color: #F6AE2D;
  h3 {
    color: #F6AE2D;
  }
}
</style>
