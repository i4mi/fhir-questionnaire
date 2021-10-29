declare module "fhirpath" {
    import { Resource } from "@i4mi/fhir_r4";

    function evaluate(resource: Resource, expression: string, environment?: Object, model?: any): any[];
    function compile(expression: string, model?: any): (resource: Resource, environment?: Object) => any[];
}