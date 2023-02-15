declare module 'fhirpath' {
    import { Resource } from '@i4mi/fhir_r4';

    function evaluate(resource: Resource, expression: string, environment?: object, model?: unknown): unknown[];
    function compile(expression: string, model?: unknown): (resource: Resource, environment?: object) => unknown[];
}