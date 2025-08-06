# MedAuth Pro - Prior Authorization Management System

## Overview
MedAuth Pro is a comprehensive healthcare prior authorization management system designed to streamline patient information, insurance verification, and authorization requests. It is a full-stack web application built with a React frontend and Express.js backend, focusing on HIPAA compliance and security. The project aims to improve authorization processing efficiency, approval rates, and staff productivity by offering features such as robust authentication, patient management with CSV import, a 10-step prior authorization workflow, external connections with major insurance providers, secure document management, and a comprehensive audit trail system.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **Form Handling**: React Hook Form with Zod validation
- **UI/UX Decisions**: Modern, responsive design with a healthcare-specific color scheme, accessible components using Radix UI primitives, and a mobile-responsive layout.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication with bcrypt for password hashing and role-based access control (admin, doctor, staff).
- **Session Management**: Express sessions with PostgreSQL store.
- **Security**: Built-in encryption middleware for PHI (Protected Health Information), comprehensive audit logging, input sanitization and validation, and secure session management.

### Technical Implementations
- **Authentication System**: JWT token-based authentication with role-based access control and session management with automatic token refresh.
- **Database Schema**: Includes tables for Users, Patients (with PHI encryption), Insurance Providers, Patient Insurance, Prior Authorizations, Documents, and Audit Logs.
- **Patient Management**: Supports creating, editing, searching, and linking patient records with insurance information, including CSV import with duplicate detection.
- **Prior Authorization Workflow**: A 10-step process supporting multiple CPT and ICD-10 codes, status tracking (pending, approved, denied), appeals, and package generation (PDF, email, JSON).
- **External Connections**: System for integrating with insurance providers and clearinghouses via OAuth2 and API key authentication, supporting various API methods (GET, POST, PUT, DELETE, PATCH). Includes preset configurations for major systems like Availity, Change Healthcare, Relay Health, Aetna Provider API, and Anthem Provider Portal.
- **Document Management**: Secure upload, storage, and sharing of authorization documents with file type validation and version control.
- **Audit Trail System**: Comprehensive HIPAA-compliant logging of all data operations (create, read, update, delete) across all entities, including detailed metadata and before/after value tracking for updates.
- **ModMed EMA Cloud Integration**: Secure, cloud-based integration with ModMed's Electronic Medical Assistant system using OAuth2 and HL7 FHIR R4 compliance for real-time patient data sync and bulk import.
- **Medical Code Integration**: Comprehensive ICD-10 diagnosis codes and CPT procedure codes are integrated, supporting multi-code authorizations.
- **System Configuration**: Admin-only feature for customizing organization name and other system settings.

### Project Structure
- `client/`: React frontend application
- `server/`: Express.js backend API
- `shared/`: Shared TypeScript types and database schema
- `migrations/`: Database migration files

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL (for scalable cloud database)
- **UI Components**: Radix UI (for accessible component primitives), shadcn/ui (for pre-built components)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

### Development Dependencies
- **TypeScript**
- **Vite**
- **ESBuild**
- **Drizzle Kit**

### Security Dependencies
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token generation and verification
- **connect-pg-simple**: PostgreSQL session store
- **crypto**: Node.js encryption utilities