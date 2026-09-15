-- =============================================================================
-- Supabase SQL Schema for GSS Alert OKR BOT
-- Database: PostgreSQL 15+ (Supabase)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. DROP EXISTING OBJECTS (Reverse Dependency Order)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE;

DROP VIEW IF EXISTS public."Evaluations" CASCADE;
DROP VIEW IF EXISTS public."Evidence_Submissions" CASCADE;
DROP VIEW IF EXISTS public."Project_Assignments" CASCADE;
DROP VIEW IF EXISTS public."Projects" CASCADE;
DROP VIEW IF EXISTS public."OKRs" CASCADE;
DROP VIEW IF EXISTS public."Users" CASCADE;

DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.normal_reports CASCADE;
DROP TABLE IF EXISTS public.dashboard CASCADE;
DROP TABLE IF EXISTS public.evidence_submissions CASCADE;
DROP TABLE IF EXISTS public.evidences CASCADE;
DROP TABLE IF EXISTS public.project_assignments CASCADE;
DROP TABLE IF EXISTS public.project_assignees CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.okrs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- -----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. CORE TABLES (Strict Dependency Order)
-- -----------------------------------------------------------------------------

-- Table 1: Users
CREATE TABLE public.users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE,
    name VARCHAR(200),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL DEFAULT '123456',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    position VARCHAR(100),
    department VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'teacher' CHECK (role IN ('admin', 'executive', 'head_okr', 'teacher', 'staff')),
    admin_type VARCHAR(50),
    executive_level VARCHAR(50),
    employment_status VARCHAR(50) DEFAULT 'Full-Time',
    management_order INT DEFAULT 1,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    yearly_roles JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: OKRs (References users)
CREATE TABLE public.okrs (
    okr_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_title VARCHAR(255) NOT NULL,
    object TEXT,
    key_result TEXT,
    okr_type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    quarter VARCHAR(2) CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Progress', 'Completed', 'On Hold')),
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Projects (References okrs, users)
CREATE TABLE public.projects (
    project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_id UUID REFERENCES public.okrs(okr_id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    description TEXT,
    main_objective TEXT,
    sub_objective TEXT,
    department VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    head_of_project UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00 CHECK (progress_percentage BETWEEN 0 AND 100),
    budget DECIMAL(12,2) DEFAULT 0.00,
    spent_amount DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'In Progress' CHECK (status IN ('Draft', 'In Progress', 'Delayed', 'Completed', 'On Hold')),
    bottleneck TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Project Assignments (Hierarchical roles: Head / Member)
CREATE TABLE public.project_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('Head', 'Member')),
    assigned_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 6: Evidences (Legacy project evidence)
CREATE TABLE public.evidences (
    evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    description TEXT,
    upload_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 7: Evidence Submissions (Team uploads & head review)
CREATE TABLE public.evidence_submissions (
    evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    description TEXT,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 8: Dashboard (Executive OKR reports & summary)
CREATE TABLE public.dashboard (
    dashboard_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    overall_okr_info TEXT NOT NULL,
    okr_head_evaluation_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    head_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    head_name VARCHAR(255),
    academic_year INT DEFAULT 2567,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 9: Normal Reports (Project operational reports)
CREATE TABLE public.normal_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    project_details TEXT,
    responsible_person_name VARCHAR(255),
    head_name VARCHAR(255),
    project_outcome TEXT,
    initial_expected_outcome TEXT,
    head_evaluation_score DECIMAL(5,2) DEFAULT 0.00,
    team_evaluation_score DECIMAL(5,2) DEFAULT 0.00,
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 10: Evaluations (Interactive 5-level evaluations)
CREATE TABLE public.evaluations (
    eval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.normal_reports(report_id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES public.dashboard(dashboard_id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    head_score INT NOT NULL CHECK (head_score BETWEEN 1 AND 5),
    team_score INT CHECK (team_score BETWEEN 1 AND 5),
    executive_score INT CHECK (executive_score BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_okrs_year ON public.okrs(year);
CREATE INDEX IF NOT EXISTS idx_okrs_status ON public.okrs(status);
CREATE INDEX IF NOT EXISTS idx_projects_okr_id ON public.projects(okr_id);
CREATE INDEX IF NOT EXISTS idx_projects_head ON public.projects(head_of_project);
CREATE INDEX IF NOT EXISTS idx_projects_dept ON public.projects(department);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_assignments_proj_user ON public.project_assignments(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_evidences_project ON public.evidences(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submissions_proj ON public.evidence_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_year ON public.dashboard(academic_year);
CREATE INDEX IF NOT EXISTS idx_normal_reports_proj ON public.normal_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_rep ON public.evaluations(report_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_dash ON public.evaluations(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_project ON public.evaluations(project_id);

-- -----------------------------------------------------------------------------
-- 6. AUTO-UPDATED-AT TRIGGERS
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_okrs_updated_at ON public.okrs;
CREATE TRIGGER trigger_okrs_updated_at
BEFORE UPDATE ON public.okrs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
CREATE TRIGGER trigger_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_dashboard_updated_at ON public.dashboard;
CREATE TRIGGER trigger_dashboard_updated_at
BEFORE UPDATE ON public.dashboard
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_normal_reports_updated_at ON public.normal_reports;
CREATE TRIGGER trigger_normal_reports_updated_at
BEFORE UPDATE ON public.normal_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 7. SUPABASE AUTH INTEGRATION TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (
        user_id,
        email,
        first_name,
        last_name,
        position,
        department,
        role,
        status
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'ผู้ใช้งาน'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'ระบบ'),
        COALESCE(NEW.raw_user_meta_data->>'position', 'อาจารย์'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'ภาควิชาวิทยาการคอมพิวเตอร์'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
        COALESCE(NEW.raw_user_meta_data->>'status', 'pending')
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normal_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Users Policies
DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
CREATE POLICY "Users can read profiles"
ON public.users FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can manage all users" ON public.users;
CREATE POLICY "Admin can manage all users"
ON public.users FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Allow user registration" ON public.users;
CREATE POLICY "Allow user registration"
ON public.users FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- OKRs Policies
DROP POLICY IF EXISTS "Authenticated users can read okrs" ON public.okrs;
CREATE POLICY "Authenticated users can read okrs"
ON public.okrs FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admin and Head can insert okrs" ON public.okrs;
CREATE POLICY "Admin and Head can insert okrs"
ON public.okrs FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role IN ('admin', 'head_okr', 'executive')
    )
);

DROP POLICY IF EXISTS "Admin and Creator can update okrs" ON public.okrs;
CREATE POLICY "Admin and Creator can update okrs"
ON public.okrs FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Projects Policies
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
CREATE POLICY "Authenticated users can read projects"
ON public.projects FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Head and Admin can insert projects" ON public.projects;
CREATE POLICY "Head and Admin can insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role IN ('admin', 'head_okr')
    )
);

DROP POLICY IF EXISTS "Head, Assignees, and Admin can update projects" ON public.projects;
CREATE POLICY "Head, Assignees, and Admin can update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
    head_of_project = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.project_assignments
        WHERE project_id = projects.project_id AND user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Project Assignments Policies
DROP POLICY IF EXISTS "Authenticated users can read assignments" ON public.project_assignments;
CREATE POLICY "Authenticated users can read assignments"
ON public.project_assignments FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Head and Admin can manage assignments" ON public.project_assignments;
CREATE POLICY "Head and Admin can manage assignments"
ON public.project_assignments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE project_id = project_assignments.project_id AND head_of_project = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Evidences Policies
DROP POLICY IF EXISTS "Authenticated users can read evidences" ON public.evidences;
CREATE POLICY "Authenticated users can read evidences"
ON public.evidences FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Project team can insert evidence" ON public.evidences;
CREATE POLICY "Project team can insert evidence"
ON public.evidences FOR INSERT
TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.projects
        WHERE project_id = evidences.project_id AND head_of_project = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Uploader or Admin can delete evidence" ON public.evidences;
CREATE POLICY "Uploader or Admin can delete evidence"
ON public.evidences FOR DELETE
TO authenticated
USING (
    uploaded_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Evidence Submissions Policies
DROP POLICY IF EXISTS "Authenticated users can read evidence submissions" ON public.evidence_submissions;
CREATE POLICY "Authenticated users can read evidence submissions"
ON public.evidence_submissions FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Members can submit evidence" ON public.evidence_submissions;
CREATE POLICY "Members can submit evidence"
ON public.evidence_submissions FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role IN ('admin', 'head_okr')
    )
);

DROP POLICY IF EXISTS "Sender or Admin can delete evidence submissions" ON public.evidence_submissions;
CREATE POLICY "Sender or Admin can delete evidence submissions"
ON public.evidence_submissions FOR DELETE
TO authenticated
USING (
    sender_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Dashboard Reports Policies
DROP POLICY IF EXISTS "Dashboard readable by all" ON public.dashboard;
CREATE POLICY "Dashboard readable by all"
ON public.dashboard FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Executive and Admin can manage dashboard" ON public.dashboard;
CREATE POLICY "Executive and Admin can manage dashboard"
ON public.dashboard FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role IN ('admin', 'executive', 'head_okr')
    )
);

-- Normal Reports Policies
DROP POLICY IF EXISTS "Normal reports readable by all" ON public.normal_reports;
CREATE POLICY "Normal reports readable by all"
ON public.normal_reports FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Authenticated can insert normal reports" ON public.normal_reports;
CREATE POLICY "Authenticated can insert normal reports"
ON public.normal_reports FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Creator or Admin can update normal reports" ON public.normal_reports;
CREATE POLICY "Creator or Admin can update normal reports"
ON public.normal_reports FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Evaluations Policies
DROP POLICY IF EXISTS "Evaluations readable by all" ON public.evaluations;
CREATE POLICY "Evaluations readable by all"
ON public.evaluations FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Authenticated can submit evaluations" ON public.evaluations;
CREATE POLICY "Authenticated can submit evaluations"
ON public.evaluations FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Evaluator or Admin can update evaluations" ON public.evaluations;
CREATE POLICY "Evaluator or Admin can update evaluations"
ON public.evaluations FOR UPDATE
TO authenticated
USING (
    evaluator_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- -----------------------------------------------------------------------------
-- 9. SEED DATA (Consistent IDs across system)
-- -----------------------------------------------------------------------------

-- Users
INSERT INTO public.users (user_id, username, email, password, first_name, last_name, position, department, role, admin_type, executive_level, management_order, avatar_url, status)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@science.ac.th', 'password123', 'ผู้ดูแลระบบ', 'ส่วนกลาง', 'ผู้ดูแลระบบเทคโนโลยีสารสนเทศ', 'สำนักงานคณบดี', 'admin', 'Super Admin', NULL, 1, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000002', 'dean', 'dean@science.ac.th', 'password123', 'ศ.ดร.ประสิทธิ์', 'พัฒนาวิทย์', 'คณบดีคณะวิทยาศาสตร์', 'สำนักงานคณบดี', 'executive', NULL, 'คณบดี', 1, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000003', 'vice.dean', 'vice.dean@science.ac.th', 'password123', 'รศ.ดร.วิชัย', 'เกียรติขจร', 'รองคณบดีฝ่ายวิชาการและวิจัย', 'สำนักงานคณบดี', 'executive', NULL, 'รองคณบดี', 2, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000004', 'head.cs', 'head.cs@science.ac.th', 'password123', 'ผศ.ดร.สมชาย', 'ใจดี', 'หัวหน้าภาควิชาวิทยาการคอมพิวเตอร์', 'ภาควิชาวิทยาการคอมพิวเตอร์', 'head_okr', NULL, NULL, 3, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000005', 'head.chem', 'head.chem@science.ac.th', 'password123', 'รศ.ดร.นภา', 'สิริกุล', 'หัวหน้าภาควิชาเคมี', 'ภาควิชาเคมี', 'head_okr', NULL, NULL, 3, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000006', 'teacher.cs1', 'teacher.cs1@science.ac.th', 'password123', 'อ.ดร.กานดา', 'สุขสมบัติ', 'อาจารย์ประจำภาควิชา', 'ภาควิชาวิทยาการคอมพิวเตอร์', 'teacher', NULL, NULL, 4, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000007', 'teacher.chem1', 'teacher.chem1@science.ac.th', 'password123', 'ผศ.ดร.อนันต์', 'แสงทอง', 'อาจารย์ประจำภาควิชา', 'ภาควิชาเคมี', 'teacher', NULL, NULL, 4, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000008', 'staff.plan', 'staff.plan@science.ac.th', 'password123', 'น.ส.วิภาดา', 'นโยบายดี', 'เจ้าหน้าที่วิเคราะห์นโยบายและแผน', 'สำนักงานคณบดี', 'staff', NULL, NULL, 5, 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000009', 'staff.general', 'staff.general@science.ac.th', 'password123', 'นายธนภัทร', 'สุขประสิทธิ์', 'เจ้าหน้าที่บริหารงานทั่วไป', 'สำนักงานคณบดี', 'staff', NULL, NULL, 5, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', 'approved'),
    ('00000000-0000-0000-0000-000000000010', 'staff.finance', 'staff.finance@science.ac.th', 'password123', 'น.ส.กมลวรรณ', 'ทรัพย์เจริญ', 'เจ้าหน้าที่การเงินและพัสดุ', 'สำนักงานคณบดี', 'staff', NULL, NULL, 5, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'approved')
ON CONFLICT (user_id) DO NOTHING;

-- OKRs
INSERT INTO public.okrs (okr_id, okr_title, okr_type, year, quarter, status, created_by)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'ยกระดับผลงานวิจัยและนวัตกรรมสู่ระดับสากล (Q1-Q4 / 2567)', 'ด้านการวิจัยและนวัตกรรม', 2567, 'Q1', 'In Progress', '00000000-0000-0000-0000-000000000002'),
    ('10000000-0000-0000-0000-000000000002', 'ปฏิรูปหลักสูตรการศึกษาและพัฒนาสมรรถนะนิสิตแห่งอนาคต', 'ด้านการศึกษาและวิชาการ', 2567, 'Q1', 'In Progress', '00000000-0000-0000-0000-000000000003'),
    ('10000000-0000-0000-0000-000000000003', 'บริการวิชาการเพื่อเสริมสร้างความเข้มแข็งของชุมชนและสังคม', 'ด้านบริการวิชาการ', 2567, 'Q2', 'In Progress', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (okr_id) DO NOTHING;

-- Projects
INSERT INTO public.projects (project_id, okr_id, project_name, project_type, description, main_objective, sub_objective, department, start_date, end_date, head_of_project, progress_percentage, budget, spent_amount, status, bottleneck)
VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'โครงการพัฒนาระบบ AI สำหรับวิเคราะห์ข้อมูลจีโนมิกส์ทางการแพทย์', 'งานวิจัยขั้นแนวหน้า', 'วิจัยและสร้างโมเดลปัญญาประดิษฐ์ประมวลผลจีโนมเพื่อการวินิจฉัยโรคพันธุกรรมความแม่นยำสูง', 'ตีพิมพ์ในวารสารระดับ Q1 จำนวน 2 บทความ', 'พัฒนาระบบต้นแบบและทดสอบกับชุดข้อมูลจริงร่วมกับโรงพยาบาลศิริราช', 'ภาควิชาวิทยาการคอมพิวเตอร์', '2024-01-01', '2024-12-31', '00000000-0000-0000-0000-000000000004', 85.00, 850000.00, 680000.00, 'In Progress', NULL),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'โครงการสังเคราะห์วัสดุนาโนอัจฉริยะเพื่อการกักเก็บพลังงานสะอาด', 'งานวิจัยนวัตกรรม', 'พัฒนาแบตเตอรี่และเซลล์พลังงานแสงอาทิตย์รุ่นใหม่', 'ยื่นจดสิทธิบัตร 1 ผลงาน', 'ทดสอบประสิทธิภาพการกักเก็บประจุ', 'ภาควิชาเคมี', '2024-02-01', '2024-11-30', '00000000-0000-0000-0000-000000000005', 72.50, 1200000.00, 950000.00, 'Delayed', 'รอการส่งมอบสารเคมีนำเข้าจากต่างประเทศล่าช้า 2 สัปดาห์'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'โครงการจัดตั้งศูนย์ความเป็นเลิศด้าน Cloud & Quantum Computing', 'พัฒนาโครงสร้างพื้นฐาน', 'สร้างห้องปฏิบัติการและหลักสูตรฝึกอบรมสมรรถนะสูง', 'นิสิตผ่านการอบรม 200 คน และได้รับมาตรฐานอุตสาหกรรม', 'ติดตั้งเครื่องมือแม่ข่าย', 'ภาควิชาวิทยาการคอมพิวเตอร์', '2024-03-01', '2024-10-31', '00000000-0000-0000-0000-000000000006', 95.00, 650000.00, 620000.00, 'In Progress', NULL),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'โครงการตรวจวัดคุณภาพน้ำและสิ่งแวดล้อมชุมชนลุ่มน้ำภาคกลาง', 'บริการวิชาการเพื่อสังคม', 'ถ่ายทอดเทคโนโลยีการตรวจวัดสารเคมีในแหล่งน้ำชุมชน', 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นได้เอง', 'จัดทำคู่มือและชุดทดสอบภาคสนาม', 'ภาควิชาเคมี', '2024-01-15', '2024-09-30', '00000000-0000-0000-0000-000000000007', 100.00, 350000.00, 350000.00, 'Completed', NULL)
ON CONFLICT (project_id) DO NOTHING;

-- Project Assignments (Role-based)
INSERT INTO public.project_assignments (assignment_id, project_id, user_id, role_type, assigned_by)
VALUES
    ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Head', '00000000-0000-0000-0000-000000000002'),
    ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'Member', '00000000-0000-0000-0000-000000000004'),
    ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'Head', '00000000-0000-0000-0000-000000000002'),
    ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'Member', '00000000-0000-0000-0000-000000000005')
ON CONFLICT (assignment_id) DO NOTHING;

-- Evidences
INSERT INTO public.evidences (evidence_id, project_id, uploaded_by, file_name, file_path, file_size, description)
VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'ai_genomics_model_benchmark_report.pdf', 'https://example.com/files/genomics_draft.pdf', 2458900, 'ร่างบทความวิจัยเตรียมส่ง IEEE Transactions on AI'),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'water_quality_community_report_final.pdf', 'https://example.com/files/water_report.pdf', 5840200, 'รายงานสรุปผลการตรวจวัดคุณภาพน้ำและใบตอบรับจากชุมชน 5 แห่ง')
ON CONFLICT (evidence_id) DO NOTHING;

-- Evidence Submissions
INSERT INTO public.evidence_submissions (evidence_id, project_id, sender_id, file_name, file_path, file_type, submitted_at)
VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'ai_genomics_model_benchmark_report.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'application/pdf', '2024-09-15T10:30:00Z'),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'lab_experiment_photo_validation.jpg', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80', 'image/jpeg', '2024-09-20T16:45:00Z'),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'water_quality_community_report_final.pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'application/pdf', '2024-09-28T14:20:00Z')
ON CONFLICT (evidence_id) DO NOTHING;

-- Dashboard Reports
INSERT INTO public.dashboard (dashboard_id, overall_okr_info, okr_head_evaluation_score, head_id, head_name, academic_year)
VALUES
    ('40000000-0000-0000-0000-000000000001', 'สรุปภาพรวมยุทธศาสตร์ OKR ภาควิชาวิทยาการคอมพิวเตอร์: ดำเนินโครงการ AI ด้านพันธุศาสตร์และศูนย์ Cloud Computing บรรลุผลสัมฤทธิ์ร้อยละ 90 มีการส่งมอบระบบต้นแบบและเตรียมตีพิมพ์วารสารสากล 2 ฉบับ พร้อมเปิดศูนย์ฝึกอบรมรองรับนิสิต 200 คนตามเป้าหมาย', 92.50, '00000000-0000-0000-0000-000000000004', 'ผศ.ดร.สมชาย ใจดี', 2567),
    ('40000000-0000-0000-0000-000000000002', 'สรุปภาพรวมยุทธศาสตร์ OKR ภาควิชาเคมี: ดำเนินโครงการตรวจวัดคุณภาพน้ำชุมชนสำเร็จครบถ้วน 100% ส่วนโครงการสังเคราะห์วัสดุนาโนคาร์บอนเพื่อกักเก็บพลังงานสะอาดคืบหน้า 72.5% รอส่งมอบสารเคมีนำเข้าเพื่อทดสอบขั้นตอนสุดท้าย', 86.00, '00000000-0000-0000-0000-000000000005', 'รศ.ดร.นภา สิริกุล', 2567)
ON CONFLICT (dashboard_id) DO NOTHING;

-- Normal Reports
INSERT INTO public.normal_reports (report_id, project_id, project_name, project_details, responsible_person_name, head_name, project_outcome, initial_expected_outcome, head_evaluation_score, team_evaluation_score, created_by)
VALUES
    ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'โครงการพัฒนาระบบ AI สำหรับวิเคราะห์ข้อมูลจีโนมิกส์ทางการแพทย์', 'รายงานสรุปความก้าวหน้าการพัฒนาระบบ AI และชุดทดสอบอัลกอริทึมในการวิเคราะห์ยีนกลายพันธุ์', 'อ.ดร.กานดา สุขสมบัติ', 'ผศ.ดร.สมชาย ใจดี', 'โมเดล AI มีความแม่นยำ 94.2% และเตรียมยื่นตีพิมพ์ฉบับสมบูรณ์ในวารสาร IEEE', 'ตีพิมพ์ในวารสารระดับ Q1 จำนวน 2 บทความ', 90.00, 88.50, '00000000-0000-0000-0000-000000000004'),
    ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'โครงการตรวจวัดคุณภาพน้ำและสิ่งแวดล้อมชุมชนลุ่มน้ำภาคกลาง', 'โครงการบริการวิชาการถ่ายทอดเทคโนโลยีการตรวจวัดสารเคมีในแหล่งน้ำแก่ผู้นำชุมชน', 'ผศ.ดร.อนันต์ แสงทอง', 'รศ.ดร.นภา สิริกุล', 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นและบริหารจัดการน้ำได้จริง มีหนังสือตอบรับครบ 100%', 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นและบริหารจัดการน้ำได้เอง', 98.00, 96.00, '00000000-0000-0000-0000-000000000005')
ON CONFLICT (report_id) DO NOTHING;

-- Evaluations
INSERT INTO public.evaluations (eval_id, report_id, dashboard_id, evaluator_id, head_score, team_score)
VALUES
    ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', NULL, '00000000-0000-0000-0000-000000000004', 5, 4),
    ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', NULL, '00000000-0000-0000-0000-000000000005', 5, 5),
    ('70000000-0000-0000-0000-000000000003', NULL, '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 5, NULL)
ON CONFLICT (eval_id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'OKR-files',
    'OKR-files',
    true,
    52428800,
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public Access OKR-files" ON storage.objects;
CREATE POLICY "Public Access OKR-files" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'OKR-files');

DROP POLICY IF EXISTS "Allow Upload OKR-files" ON storage.objects;
CREATE POLICY "Allow Upload OKR-files" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'OKR-files');

DROP POLICY IF EXISTS "Allow Update OKR-files" ON storage.objects;
CREATE POLICY "Allow Update OKR-files" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'OKR-files')
    WITH CHECK (bucket_id = 'OKR-files');

DROP POLICY IF EXISTS "Allow Delete OKR-files" ON storage.objects;
CREATE POLICY "Allow Delete OKR-files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'OKR-files');

