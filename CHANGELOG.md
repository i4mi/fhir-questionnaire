| Version | Date       | Changes    |
| ------- | ---------- | ---------- |
| 0.3.0   | 2025-05-26 | - fix a bug with nested questions, that resulted in invalid QuestionnaireResponse resources. <br />⚠️ This means that generated QuestionnaireResponse resources can differ from previous versions output.|
| 0.2.4   | 2024-12-06 | - fix bugs in narrative that resulted in resources not validating |
| 0.2.3   | 2024-11-20 | - make availableLanguages optional again in QuestionnaireData constructor |
| 0.2.2   | 2024-08-28 | - add isTouched() |
| 0.2.1   | 2023-03-22 | - remove unneeded logging |
| 0.2.0   | 2023-03-21 | - add getQuestionnaireDescription()<br />- add isQuestionComplete()<br />- generate narrative for QuestionnaireResponse<br />- field `midataExtensions` added to getQuestionnaireResponse() options<br />- support initial values<br />- add tests (coverage >80%)<br />- various bugfixes |
| 0.1.2   | 2022-11-15 | - fix bug with embedded valuesets without I18N |
| 0.1.1   | 2022-11-15 | - add install instructions to README |
| 0.1.0   | 2022-10-25 | - first public version |