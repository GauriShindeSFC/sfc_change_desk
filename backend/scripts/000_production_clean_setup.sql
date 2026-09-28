-- ==============================================================================
-- Production Setup DDL: 000_production_clean_setup.sql
-- Description: Creates only the final native ChangeDesk application schema.
-- Constraints:
--   • Strictly EXCLUDES external tables (`user`, `employees`).
--   • Strictly EXCLUDES deprecated features (workflows, draft, department, risk, sla).
--   • Data transfer from current/staging tables is kept completely separate.
-- ==============================================================================

BEGIN;

-- 1. App Configuration Singleton Store
CREATE TABLE IF NOT EXISTS public.app_config (
    key character varying NOT NULL,
    value jsonb NOT NULL,
    CONSTRAINT app_config_pkey PRIMARY KEY (key)
);

-- 2. Audit Trail
CREATE SEQUENCE IF NOT EXISTS public.audit_logs_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id bigint NOT NULL DEFAULT nextval('public.audit_logs_id_seq'::regclass),
    actor_id character varying NOT NULL,
    action character varying NOT NULL,
    ref character varying,
    detail text,
    timestamp timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- 3. Roles and Permissions
CREATE TABLE IF NOT EXISTS public.roles (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);

-- 4. Application Identity User Profiles
CREATE TABLE IF NOT EXISTS public.change_user (
    id character varying NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    designation character varying DEFAULT ''::character varying,
    role_id character varying NOT NULL DEFAULT 'role-4'::character varying,
    role_name character varying NOT NULL DEFAULT 'Requester'::character varying,
    status character varying NOT NULL DEFAULT 'Active'::character varying,
    invited_by character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT change_user_pkey PRIMARY KEY (id),
    CONSTRAINT change_user_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS change_user_role_id ON public.change_user USING btree (role_id);
CREATE INDEX IF NOT EXISTS change_user_status ON public.change_user USING btree (status);

-- 5. User Single-Role Identity Mapping (Legacy Support)
CREATE TABLE IF NOT EXISTS public.changedesk_identity_roles (
    user_key character varying(100) NOT NULL,
    role_id character varying(50) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT changedesk_identity_roles_pkey PRIMARY KEY (user_key),
    CONSTRAINT changedesk_identity_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE NO ACTION
);

-- 6. Catalog Categories
CREATE TABLE IF NOT EXISTS public.catalog_categories (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    CONSTRAINT catalog_categories_pkey PRIMARY KEY (id)
);

-- 7. Catalog Subcategories (Clean: No SLA, No Risk, No Workflow FK)
CREATE TABLE IF NOT EXISTS public.catalog_subcategories (
    id character varying NOT NULL,
    category_id character varying NOT NULL,
    name character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'Active'::character varying,
    CONSTRAINT catalog_subcategories_pkey PRIMARY KEY (id),
    CONSTRAINT catalog_subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cat_subcat_category_id ON public.catalog_subcategories USING btree (category_id);

-- 8. Catalog Subcategory Dynamic Schema Fields
CREATE TABLE IF NOT EXISTS public.catalog_subcategory_fields (
    id character varying NOT NULL,
    subcategory_id character varying NOT NULL,
    field_key character varying NOT NULL,
    field_label character varying NOT NULL,
    field_type character varying NOT NULL DEFAULT 'text'::character varying,
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    applies_to_actions jsonb,
    options jsonb,
    CONSTRAINT catalog_subcategory_fields_pkey PRIMARY KEY (id),
    CONSTRAINT catalog_subcategory_fields_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.catalog_subcategories(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subcat_fields_subcat_id ON public.catalog_subcategory_fields USING btree (subcategory_id);

-- 9. Category Assignment Tables (Checker / Maker)
CREATE TABLE IF NOT EXISTS public.change_manager_categories (
    id character varying NOT NULL,
    user_id character varying NOT NULL,
    category_id character varying NOT NULL,
    CONSTRAINT change_manager_categories_pkey PRIMARY KEY (id),
    CONSTRAINT change_manager_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS change_manager_categories_user_category_unique ON public.change_manager_categories USING btree (user_id, category_id);

CREATE TABLE IF NOT EXISTS public.change_implementer_categories (
    id character varying NOT NULL,
    user_id character varying NOT NULL,
    category_id character varying NOT NULL,
    CONSTRAINT change_implementer_categories_pkey PRIMARY KEY (id),
    CONSTRAINT change_implementer_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS change_implementer_categories_user_category_unique ON public.change_implementer_categories USING btree (user_id, category_id);

-- 10. Sequences for Atomic Code Generation
CREATE SEQUENCE IF NOT EXISTS public.change_request_id_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.prespend_code_seq_2026 START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.travel_code_seq_2026 START WITH 1 INCREMENT BY 1;

-- Table: Change Requests (Clean: No workflow_id, No is_draft, No risk)

CREATE TABLE IF NOT EXISTS public.change_requests (
    id character varying NOT NULL,
    title character varying NOT NULL,
    category character varying NOT NULL,
    sub_category character varying DEFAULT ''::character varying,
    subcategory_id character varying,
    employee_id character varying DEFAULT ''::character varying,
    employee_name character varying,
    employee_email character varying,
    manager_name character varying,
    manager_email character varying DEFAULT ''::character varying,
    location character varying,
    justification text DEFAULT ''::text,
    start_date character varying,
    end_date character varying,
    active_step integer DEFAULT 1,
    status character varying DEFAULT 'Pending'::character varying,
    approval_stage character varying(32) DEFAULT 'manager_review'::character varying,
    approval_cycle integer DEFAULT 1,
    manager_review_entered_at timestamp with time zone,
    submitted_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    requester_id character varying NOT NULL,
    approver_id character varying,
    rejection_reason text,
    custom_field_values jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT change_requests_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_change_requests_requester_id ON public.change_requests USING btree (requester_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON public.change_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_change_requests_category ON public.change_requests USING btree (category);
CREATE INDEX IF NOT EXISTS idx_change_requests_submitted_at ON public.change_requests USING btree (submitted_at);
CREATE INDEX IF NOT EXISTS idx_change_requests_requester_submitted_at ON public.change_requests USING btree (requester_id, submitted_at DESC);

-- 11. Change Request Approval Decisions
CREATE SEQUENCE IF NOT EXISTS public.change_request_approvals_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.change_request_approvals (
    id integer NOT NULL DEFAULT nextval('public.change_request_approvals_id_seq'::regclass),
    change_request_id character varying NOT NULL,
    approver_id character varying NOT NULL,
    decision character varying NOT NULL DEFAULT 'Pending'::character varying,
    decided_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT change_request_approvals_pkey PRIMARY KEY (id),
    CONSTRAINT change_request_approvals_change_request_id_fkey FOREIGN KEY (change_request_id) REFERENCES public.change_requests(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cra_request_approver_unique ON public.change_request_approvals USING btree (change_request_id, approver_id);
CREATE INDEX IF NOT EXISTS idx_cra_approver_request_decision ON public.change_request_approvals USING btree (approver_id, change_request_id, decision);

-- 12. Pre-Spend Requisitions
CREATE TABLE IF NOT EXISTS public.pre_spend_requests (
    id character varying NOT NULL,
    request_code character varying(32),
    requester_id character varying(64),
    requester_name character varying(255),
    requester_email character varying(255),
    category character varying(100) NOT NULL,
    subcategory character varying(100) NOT NULL,
    item_description text NOT NULL,
    location character varying(150),
    estimated_amount numeric(14,2) DEFAULT 0,
    needed_by_date date,
    cost_centre character varying(100),
    budget_line character varying(150),
    business_justification text,
    is_urgent boolean DEFAULT false,
    urgent_reason text,
    vendors jsonb DEFAULT '[]'::jsonb,
    selected_vendor character varying(255),
    commercial_exception character varying(100),
    commercial_reason text,
    commercial_justification text,
    status character varying(50) DEFAULT 'Pending Approval'::character varying,
    approval_stage character varying(32) DEFAULT 'manager_review'::character varying,
    approval_cycle integer DEFAULT 1,
    manager_name character varying(255),
    manager_email character varying(255),
    manager_review_entered_at timestamp with time zone,
    policy_certified boolean DEFAULT false,
    approval_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pre_spend_requests_pkey PRIMARY KEY (id),
    CONSTRAINT pre_spend_requests_request_code_key UNIQUE (request_code)
);

CREATE INDEX IF NOT EXISTS idx_prespend_status ON public.pre_spend_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_prespend_requester ON public.pre_spend_requests USING btree (requester_id);

-- 13. Travel Requisitions (Clean: No department column)
CREATE TABLE IF NOT EXISTS public.travel_requests (
    id character varying NOT NULL,
    request_code character varying(32),
    requester_id character varying(64),
    traveller_name character varying(255) NOT NULL,
    traveller_email character varying(255),
    travel_mode character varying(32) NOT NULL,
    purpose text NOT NULL,
    trip_type character varying(50),
    travel_class character varying(50),
    from_location character varying(255),
    to_location character varying(255),
    departure_date date,
    return_date date,
    preferred_time_slot character varying(100),
    is_short_notice boolean DEFAULT false,
    booking_details jsonb DEFAULT '{}'::jsonb,
    status character varying(50) DEFAULT 'Pending Approval'::character varying,
    approval_stage character varying(32) DEFAULT 'manager_review'::character varying,
    approval_cycle integer DEFAULT 1,
    manager_name character varying(255),
    manager_email character varying(255),
    manager_review_entered_at timestamp with time zone,
    policy_certified boolean DEFAULT false,
    approval_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT travel_requests_pkey PRIMARY KEY (id),
    CONSTRAINT travel_requests_request_code_key UNIQUE (request_code)
);

CREATE INDEX IF NOT EXISTS idx_travel_status ON public.travel_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_travel_requester ON public.travel_requests USING btree (requester_id);

-- 14. Notification Queue Jobs
CREATE TABLE IF NOT EXISTS public.notification_jobs (
    id uuid NOT NULL,
    module character varying(32) NOT NULL,
    request_id character varying(64) NOT NULL,
    approval_cycle integer DEFAULT 1,
    job_type character varying(64) NOT NULL,
    recipient_email character varying(255) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb,
    status character varying(32) DEFAULT 'pending'::character varying,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 5,
    last_error text,
    locked_until timestamp with time zone,
    worker_id character varying(100),
    sent_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT notification_jobs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_nj_status_locked_until ON public.notification_jobs USING btree (status, locked_until);
CREATE INDEX IF NOT EXISTS idx_nj_module_request_id ON public.notification_jobs USING btree (module, request_id);
CREATE INDEX IF NOT EXISTS idx_nj_created_at ON public.notification_jobs USING btree (created_at);

-- 15. Sequences for ID generation
-- Change Request base sequence (starts after default baseline 2054 if no prior data)
CREATE SEQUENCE IF NOT EXISTS public.change_request_id_seq START WITH 2055;

-- Annual sequences for Pre-Spend and Travel (e.g. current year 2026)
CREATE SEQUENCE IF NOT EXISTS public.prespend_code_seq_2026 START WITH 1;
CREATE SEQUENCE IF NOT EXISTS public.travel_code_seq_2026 START WITH 1;

COMMIT;
