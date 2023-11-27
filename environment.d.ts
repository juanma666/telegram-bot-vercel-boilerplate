export { }; // Esto convierte el archivo en un módulo

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            ENVIRONMENT: string;
        }
    }
}