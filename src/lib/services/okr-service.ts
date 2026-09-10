/**
 * Facade barrel for all domain services.
 * Re-exports User, Project, OKR, Evidence, Assignment, Report, and Evaluation services
 * to ensure 100% backward compatibility with all existing imports.
 */
export * from './service-helpers'
export * from './user-service'
export * from './project-service'
export * from './evidence-service'
export * from './assignment-service'
export * from './report-service'
