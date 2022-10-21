<template>
  <div>
    <header>
      <img src="@/assets/logo.png" />
      <h1>FHIR Questionnaire Demo</h1>
      <div id="questionnaire-selector">
        <span> Fragebogen auswählen: </span>
        <select name="questionnaire-selector">
          <option
            v-for="questionnaire in questionnaires"
            :key="questionnaire.name"
            @click="setQuestionnaire(questionnaire)"
          >
            {{ questionnaire.name }}
          </option>
        </select>
      </div>
    </header>

    <main>
      <div v-if="qData !== undefined">
        <QuestionComponent
          v-for="question in qData.getQuestions()"
          :key="question.id"
          :question="question"
          :language="lang"
          :onAnswer="qData.updateQuestionAnswers"
          :isSelected="qData.isAnswerOptionSelected"
        />
        <button @click="setAnswers">Antworten speichern</button>
      </div>
      <p v-if="qData === undefined">
        Es wurde noch kein Fragebogen ausgewählt.
      </p>
    </main>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import QuestionComponent from "./components/Question.vue";
import ZARIT from "@/assets/questionnaires/zarit.json";
import BLUEBOOK from "@/assets/questionnaires/bluebook.json";
import { Questionnaire } from "@i4mi/fhir_r4";
import { QuestionnaireData } from "@i4mi/fhir_questionnaire";

const OWN_QUESTIONNAIRE = "[ eigener Fragebogen ]";

export default defineComponent({
  name: "App",
  components: { QuestionComponent },
  data() {
    return {
      lang: "de",
      availableLanguages: ["de", "en", "fr"],
      qData: undefined as QuestionnaireData | undefined,
      questionnaires: [
        {
          name: "",
          description: "",
          questionnaire: undefined,
        },
        {
          name: "ZARIT",
          description:
            "Der ZARIT Fragebogen dient pflegenden Angehörigen dazu, ihre eigene Belastung zu evaluieren. Der Fragebogen ist verfügbar in deutsch und französisch.",
          questionnaire: ZARIT as Questionnaire,
        },
        {
          name: "Bluebook",
          description: "Irgend ein Fragebogen, den ich im Netz gefunden habe.",
          questionnaire: BLUEBOOK as Questionnaire,
        },
        {
          name: OWN_QUESTIONNAIRE,
          description: "Laden Sie Ihren eigenen FHIR Questionnaire.",
          questionnaire: {} as Questionnaire,
        },
      ],
    };
  },
  mounted() {},
  methods: {
    setQuestionnaire(q: {
      name: string;
      description: string;
      questionnaire: Questionnaire | undefined;
    }): void {
      if (q.questionnaire) {
        if (confirm(q.description + "\n\nDiesen Fragebogen laden?")) {
          if (q.name === OWN_QUESTIONNAIRE) {
            console.log('eigener laden');
          } else {
            this.qData = new QuestionnaireData(
              q.questionnaire,
              this.availableLanguages
            );
          }
        }
      } else {
        this.qData = undefined;
      }
    },
    setAnswers(): void {
      if (!this.qData) return;
      try {
        console.log(
          this.qData.getQuestionnaireResponse(this.lang, {
            reset: true,
            includeID: true,
          })
        );
        this.qData.resetResponse();
      } catch (error) {
        console.log("Es ging etwas schief beim Questionnaire speichern", error);
      }
    },
  },
});
</script>

<style scoped>
header {
  width: 100%;
  height: 5em;
  background-color: black;
  display: inline-flex;
}
header img {
  height: 4rem;
  margin: 0.5rem;
}
header h1 {
  font-size: 2.5rem;
  background: -webkit-linear-gradient(45deg, #d73e2e, #fef7d0);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 400;
  margin: 1rem;
  padding: 0;
}
header #questionnaire-selector {
  font-weight: light;
  position: absolute;
  right: 1em;
  top: 2em;
  height: 2em;
}
main {
  margin: 1em;
  font-weight: light;
}
</style>
