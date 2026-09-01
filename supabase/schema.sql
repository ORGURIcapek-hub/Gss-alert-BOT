CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.evidences CASCADE;
DROP TABLE IF EXISTS public.project_assignees CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.okrs CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TABLE IF EXISTS public."Audit_Logs" CASCADE;
DROP TABLE IF EXISTS public."Reports" CASCADE;
DROP TABLE IF EXISTS public."Evidences" CASCADE;
DROP TABLE IF EXISTS public."Project_Assignees" CASCADE;
DROP TABLE IF EXISTS public."Projects" CASCADE;
DROP TABLE IF EXISTS public."OKRs" CASCADE;
DROP TABLE IF EXISTS public."Users" CASCADE;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table: Project_Assignments (Handles hierarchical role and member permissions)
CREATE TABLE public.project_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('Head', 'Member')),
    assigned_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."Project_Assignments" AS SELECT * FROM public.project_assignments WITH NO DATA;

-- Table: Evidence_Submissions (Handles evidence file uploads with strict types)
CREATE TABLE public.evidence_submissions (
    evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."Evidence_Submissions" AS SELECT * FROM public.evidence_submissions WITH NO DATA;

-- Table: Evaluations (Handles interactive 5-point evaluation ratings)
CREATE TABLE public.evaluations (
    eval_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.normal_reports(report_id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES public.dashboard(dashboard_id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    head_score INT NOT NULL CHECK (head_score BETWEEN 1 AND 5),
    team_score INT CHECK (team_score BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."Evaluations" AS SELECT * FROM public.evaluations WITH NO DATA;

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

CREATE TABLE public.normal_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE SET NULL,
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

CREATE TABLE public.okrs (
    okr_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    okr_title VARCHAR(255) NOT NULL,
    okr_type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    quarter VARCHAR(2) CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Progress', 'Completed', 'On Hold')),
    created_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE public.project_assignees (
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    assigned_role VARCHAR(100) DEFAULT 'Co-Investigator',
    assigned_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE public.evidences (
    evidence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    description TEXT,
    upload_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    quarter VARCHAR(2),
    department VARCHAR(100),
    generated_for UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    report_data JSONB,
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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
        role
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'ผู้ใช้งาน'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'ระบบ'),
        COALESCE(NEW.raw_user_meta_data->>'position', 'อาจารย์'),
        COALESCE(NEW.raw_user_meta_data->>'department', 'ภาควิชาวิทยาการคอมพิวเตอร์'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'teacher')
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

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
CREATE POLICY "Users can read profiles"
ON public.users FOR SELECT
TO authenticated
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

DROP POLICY IF EXISTS "Authenticated users can read okrs" ON public.okrs;
CREATE POLICY "Authenticated users can read okrs"
ON public.okrs FOR SELECT
TO authenticated
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

DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
CREATE POLICY "Authenticated users can read projects"
ON public.projects FOR SELECT
TO authenticated
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
        SELECT 1 FROM public.project_assignees
        WHERE project_id = projects.project_id AND user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can read assignees" ON public.project_assignees;
CREATE POLICY "Authenticated users can read assignees"
ON public.project_assignees FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Head and Admin can manage assignees" ON public.project_assignees;
CREATE POLICY "Head and Admin can manage assignees"
ON public.project_assignees FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE project_id = project_assignees.project_id AND head_of_project = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Authenticated users can read evidences" ON public.evidences;
CREATE POLICY "Authenticated users can read evidences"
ON public.evidences FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Project team can insert evidence" ON public.evidences;
CREATE POLICY "Project team can insert evidence"
ON public.evidences FOR INSERT
TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    AND (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE project_id = evidences.project_id AND head_of_project = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.project_assignees
            WHERE project_id = evidences.project_id AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    )
);

DROP POLICY IF EXISTS "Reports readable by receiver or admin" ON public.reports;
CREATE POLICY "Reports readable by receiver or admin"
ON public.reports FOR SELECT
TO authenticated
USING (
    generated_for = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role IN ('admin', 'executive')
    )
);

DROP POLICY IF EXISTS "Admin read audit logs" ON public.audit_logs;
CREATE POLICY "Admin read audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

INSERT INTO public.users (user_id, email, first_name, last_name, position, department, role, executive_level, management_order)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin@science.ac.th', 'ผู้ดูแลระบบ', 'ส่วนกลาง', 'ผู้ดูแลระบบเทคโนโลยีสารสนเทศ', 'สำนักงานคณบดี', 'admin', NULL, 1),
    ('00000000-0000-0000-0000-000000000002', 'dean@science.ac.th', 'ศ.ดร.ประสิทธิ์', 'พัฒนาวิทย์', 'คณบดีคณะวิทยาศาสตร์', 'สำนักงานคณบดี', 'executive', 'คณบดี', 1),
    ('00000000-0000-0000-0000-000000000003', 'vice.dean@science.ac.th', 'รศ.ดร.วิชัย', 'เกียรติขจร', 'รองคณบดีฝ่ายวิชาการและวิจัย', 'สำนักงานคณบดี', 'executive', 'รองคณบดี', 2),
    ('00000000-0000-0000-0000-000000000004', 'head.cs@science.ac.th', 'ผศ.ดร.สมชาย', 'ใจดี', 'หัวหน้าภาควิชาวิทยาการคอมพิวเตอร์', 'ภาควิชาวิทยาการคอมพิวเตอร์', 'head_okr', NULL, 3),
    ('00000000-0000-0000-0000-000000000005', 'head.chem@science.ac.th', 'รศ.ดร.นภา', 'สิริกุล', 'หัวหน้าภาควิชาเคมี', 'ภาควิชาเคมี', 'head_okr', NULL, 3),
    ('00000000-0000-0000-0000-000000000006', 'teacher.cs1@science.ac.th', 'อ.ดร.กานดา', 'สุขสมบัติ', 'อาจารย์ประจำภาควิชา', 'ภาควิชาวิทยาการคอมพิวเตอร์', 'teacher', NULL, 4),
    ('00000000-0000-0000-0000-000000000007', 'teacher.chem1@science.ac.th', 'ผศ.ดร.อนันต์', 'แสงทอง', 'อาจารย์ประจำภาควิชา', 'ภาควิชาเคมี', 'teacher', NULL, 4),
    ('00000000-0000-0000-0000-000000000008', 'staff.plan@science.ac.th', 'น.ส.วิภาดา', 'นโยบายดี', 'เจ้าหน้าที่วิเคราะห์นโยบายและแผน', 'สำนักงานคณบดี', 'staff', NULL, 5),
    ('00000000-0000-0000-0000-000000000009', 'staff.general@science.ac.th', 'นายธนภัทร', 'สุขประสิทธิ์', 'เจ้าหน้าที่บริหารงานทั่วไป', 'สำนักงานคณบดี', 'staff', NULL, 5),
    ('00000000-0000-0000-0000-000000000010', 'staff.finance@science.ac.th', 'น.ส.กมลวรรณ', 'ทรัพย์เจริญ', 'เจ้าหน้าที่การเงินและพัสดุ', 'สำนักงานคณบดี', 'staff', NULL, 5)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.okrs (okr_id, okr_title, okr_type, year, quarter, status, created_by)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'ยกระดับผลงานวิจัยและนวัตกรรมสู่ระดับสากล (Q1-Q4 / 2567)', 'ด้านการวิจัยและนวัตกรรม', 2567, 'Q1', 'In Progress', '00000000-0000-0000-0000-000000000002'),
    ('10000000-0000-0000-0000-000000000002', 'ปฏิรูปหลักสูตรการศึกษาและพัฒนาสมรรถนะนิสิตแห่งอนาคต', 'ด้านการศึกษาและวิชาการ', 2567, 'Q1', 'In Progress', '00000000-0000-0000-0000-000000000003'),
    ('10000000-0000-0000-0000-000000000003', 'บริการวิชาการเพื่อเสริมสร้างความเข้มแข็งของชุมชนและสังคม', 'ด้านบริการวิชาการ', 2567, 'Q2', 'In Progress', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (okr_id) DO NOTHING;

INSERT INTO public.projects (project_id, okr_id, project_name, project_type, description, main_objective, sub_objective, department, start_date, end_date, head_of_project, progress_percentage, budget, spent_amount, status, bottleneck)
VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'โครงการพัฒนาระบบ AI สำหรับวิเคราะห์ข้อมูลจีโนมิกส์ทางการแพทย์', 'งานวิจัยขั้นแนวหน้า', 'วิจัยและสร้างโมเดลปัญญาประดิษฐ์ประมวลผลจีโนม', 'ตีพิมพ์ในวารสารระดับ Q1 จำนวน 2 บทความ', 'พัฒนาระบบต้นแบบและทดสอบกับข้อมูลจริง', 'ภาควิชาวิทยาการคอมพิวเตอร์', '2024-01-01', '2024-12-31', '00000000-0000-0000-0000-000000000004', 85.00, 850000.00, 680000.00, 'In Progress', NULL),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'โครงการสังเคราะห์วัสดุนาโนอัจฉริยะเพื่อการกักเก็บพลังงานสะอาด', 'งานวิจัยนวัตกรรม', 'พัฒนาแบตเตอรี่และเซลล์พลังงานแสงอาทิตย์รุ่นใหม่', 'ยื่นจดสิทธิบัตร 1 ผลงาน', 'ทดสอบประสิทธิภาพการกักเก็บประจุ', 'ภาควิชาเคมี', '2024-02-01', '2024-11-30', '00000000-0000-0000-0000-000000000005', 72.50, 1200000.00, 950000.00, 'Delayed', 'รอการส่งมอบสารเคมีนำเข้าจากต่างประเทศล่าช้า 2 สัปดาห์'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'โครงการจัดตั้งศูนย์ความเป็นเลิศด้าน Cloud & Quantum Computing', 'พัฒนาโครงสร้างพื้นฐาน', 'สร้างห้องปฏิบัติการและหลักสูตรฝึกอบรมสมรรถนะสูง', 'นิสิตผ่านการอบรม 200 คน และได้รับมาตรฐานอุตสาหกรรม', 'ติดตั้งเครื่องมือแม่ข่าย', 'ภาควิชาวิทยาการคอมพิวเตอร์', '2024-03-01', '2024-10-31', '00000000-0000-0000-0000-000000000006', 95.00, 650000.00, 620000.00, 'In Progress', NULL),
    ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', 'โครงการตรวจวัดคุณภาพน้ำและสิ่งแวดล้อมชุมชนลุ่มน้ำภาคกลาง', 'บริการวิชาการเพื่อสังคม', 'ถ่ายทอดเทคโนโลยีการตรวจวัดสารเคมีในแหล่งน้ำชุมชน', 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นได้เอง', 'จัดทำคู่มือและชุดทดสอบภาคสนาม', 'ภาควิชาเคมี', '2024-01-15', '2024-09-30', '00000000-0000-0000-0000-000000000007', 100.00, 350000.00, 350000.00, 'Completed', NULL)
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO public.project_assignees (project_id, user_id, assigned_role)
VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'หัวหน้าทีมวิจัยอัลกอริทึม'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000007', 'นักวิจัยหลักด้านการทดสอบแล็บ')
ON CONFLICT (project_id, user_id) DO NOTHING;

INSERT INTO public.evidences (evidence_id, project_id, uploaded_by, file_name, file_path, file_size, description)
VALUES
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'genomics_ai_manuscript_draft.pdf', 'https://example.com/files/genomics_draft.pdf', 2458900, 'ร่างบทความวิจัยเตรียมส่ง IEEE Transactions on AI'),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000007', 'water_quality_community_report_final.pdf', 'https://example.com/files/water_report.pdf', 5840200, 'รายงานสรุปผลการตรวจวัดคุณภาพน้ำและใบตอบรับจากชุมชน 5 แห่ง')
ON CONFLICT (evidence_id) DO NOTHING;
