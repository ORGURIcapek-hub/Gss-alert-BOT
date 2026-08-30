import { OKR, ProjectWithHeadAndAssignees, UserProfile, DashboardReport, NormalReport, ProjectAssignment, EvidenceSubmission, Evaluation } from '@/types/database.types'

export const mockUsers: UserProfile[] = [
  {
    user_id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    name: 'ผู้ดูแลระบบ ส่วนกลาง',
    email: 'admin@science.ac.th',
    password: 'password123',
    first_name: 'ผู้ดูแลระบบ',
    last_name: 'ส่วนกลาง',
    position: 'ผู้ดูแลระบบเทคโนโลยีสารสนเทศ',
    department: 'สำนักงานคณบดี',
    role: 'admin',
    admin_type: 'Super Admin',
    executive_level: null,
    employment_status: 'Full-Time',
    management_order: 1,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000002',
    username: 'dean',
    name: 'ศ.ดร.ประสิทธิ์ พัฒนาวิทย์',
    email: 'dean@science.ac.th',
    password: 'password123',
    first_name: 'ศ.ดร.ประสิทธิ์',
    last_name: 'พัฒนาวิทย์',
    position: 'คณบดีคณะวิทยาศาสตร์',
    department: 'สำนักงานคณบดี',
    role: 'executive',
    admin_type: null,
    executive_level: 'คณบดี',
    employment_status: 'Full-Time',
    management_order: 1,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000003',
    username: 'vice.dean',
    name: 'รศ.ดร.วิชัย เกียรติขจร',
    email: 'vice.dean@science.ac.th',
    password: 'password123',
    first_name: 'รศ.ดร.วิชัย',
    last_name: 'เกียรติขจร',
    position: 'รองคณบดีฝ่ายวิชาการและวิจัย',
    department: 'สำนักงานคณบดี',
    role: 'executive',
    admin_type: null,
    executive_level: 'รองคณบดี',
    management_order: 2,
    employment_status: 'Full-Time',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000004',
    username: 'head.cs',
    name: 'ผศ.ดร.สมชาย ใจดี',
    email: 'head.cs@science.ac.th',
    password: 'password123',
    first_name: 'ผศ.ดร.สมชาย',
    last_name: 'ใจดี',
    position: 'หัวหน้าภาควิชาวิทยาการคอมพิวเตอร์',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    role: 'head_okr',
    admin_type: null,
    executive_level: null,
    management_order: 3,
    employment_status: 'Full-Time',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000005',
    username: 'head.chem',
    name: 'รศ.ดร.นภา สิริกุล',
    email: 'head.chem@science.ac.th',
    password: 'password123',
    first_name: 'รศ.ดร.นภา',
    last_name: 'สิริกุล',
    position: 'หัวหน้าภาควิชาเคมี',
    department: 'ภาควิชาเคมี',
    role: 'head_okr',
    admin_type: null,
    executive_level: null,
    management_order: 3,
    employment_status: 'Full-Time',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000006',
    username: 'teacher.cs1',
    name: 'อ.ดร.กานดา สุขสมบัติ',
    email: 'teacher.cs1@science.ac.th',
    password: 'password123',
    first_name: 'อ.ดร.กานดา',
    last_name: 'สุขสมบัติ',
    position: 'อาจารย์ประจำภาควิชา',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    role: 'teacher',
    admin_type: null,
    executive_level: null,
    management_order: 4,
    employment_status: 'Full-Time',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000007',
    username: 'teacher.chem1',
    name: 'ผศ.ดร.อนันต์ แสงทอง',
    email: 'teacher.chem1@science.ac.th',
    password: 'password123',
    first_name: 'ผศ.ดร.อนันต์',
    last_name: 'แสงทอง',
    position: 'อาจารย์ประจำภาควิชา',
    department: 'ภาควิชาเคมี',
    role: 'teacher',
    admin_type: null,
    executive_level: null,
    management_order: 4,
    employment_status: 'Full-Time',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    user_id: '00000000-0000-0000-0000-000000000008',
    username: 'staff.plan',
    name: 'น.ส.วิภาดา นโยบายดี',
    email: 'staff.plan@science.ac.th',
    password: 'password123',
    first_name: 'น.ส.วิภาดา',
    last_name: 'นโยบายดี',
    position: 'เจ้าหน้าที่วิเคราะห์นโยบายและแผน',
    department: 'สำนักงานคณบดี',
    role: 'staff',
    admin_type: null,
    executive_level: null,
    management_order: 5,
    employment_status: 'Full-Time',
    avatar_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockOKRs: OKR[] = [
  {
    okr_id: '10000000-0000-0000-0000-000000000001',
    okr_title: 'ยกระดับผลงานวิจัยและนวัตกรรมสู่ระดับสากล (Q1-Q4 / 2567)',
    okr_type: 'ด้านการวิจัยและนวัตกรรม',
    year: 2567,
    quarter: 'Q1',
    status: 'In Progress',
    created_by: '00000000-0000-0000-0000-000000000002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    okr_id: '10000000-0000-0000-0000-000000000002',
    okr_title: 'ปฏิรูปหลักสูตรการศึกษาและพัฒนาสมรรถนะนิสิตแห่งอนาคต',
    okr_type: 'ด้านการศึกษาและวิชาการ',
    year: 2567,
    quarter: 'Q1',
    status: 'In Progress',
    created_by: '00000000-0000-0000-0000-000000000003',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    okr_id: '10000000-0000-0000-0000-000000000003',
    okr_title: 'บริการวิชาการเพื่อเสริมสร้างความเข้มแข็งของชุมชนและสังคม',
    okr_type: 'ด้านบริการวิชาการ',
    year: 2567,
    quarter: 'Q2',
    status: 'In Progress',
    created_by: '00000000-0000-0000-0000-000000000002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockProjects: ProjectWithHeadAndAssignees[] = [
  {
    project_id: '20000000-0000-0000-0000-000000000001',
    okr_id: '10000000-0000-0000-0000-000000000001',
    project_name: 'โครงการพัฒนาระบบ AI สำหรับวิเคราะห์ข้อมูลจีโนมิกส์ทางการแพทย์',
    project_type: 'งานวิจัยขั้นแนวหน้า',
    description: 'วิจัยและสร้างโมเดลปัญญาประดิษฐ์ประมวลผลจีโนมเพื่อการวินิจฉัยโรคพันธุกรรมความแม่นยำสูง',
    main_objective: 'ตีพิมพ์ในวารสารระดับ Q1 จำนวน 2 บทความ',
    sub_objective: 'พัฒนาระบบต้นแบบและทดสอบกับชุดข้อมูลจริงร่วมกับโรงพยาบาลศิริราช',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    head_of_project: '00000000-0000-0000-0000-000000000004',
    progress_percentage: 85,
    budget: 850000,
    spent_amount: 680000,
    status: 'In Progress',
    bottleneck: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    head: mockUsers[3],
    assignees: [
      {
        project_id: '20000000-0000-0000-0000-000000000001',
        user_id: '00000000-0000-0000-0000-000000000006',
        assigned_role: 'หัวหน้าทีมวิจัยอัลกอริทึม',
        assigned_date: '2024-01-10T00:00:00Z',
        user: mockUsers[5]
      }
    ],
    evidences: [
      {
        evidence_id: '30000000-0000-0000-0000-000000000001',
        project_id: '20000000-0000-0000-0000-000000000001',
        uploaded_by: '00000000-0000-0000-0000-000000000006',
        file_name: 'genomics_ai_manuscript_draft.pdf',
        file_path: 'https://example.com/files/genomics_draft.pdf',
        file_size: 2458900,
        description: 'ร่างบทความวิจัยเตรียมส่ง IEEE Transactions on AI',
        upload_date: '2024-06-15T09:30:00Z'
      }
    ]
  },
  {
    project_id: '20000000-0000-0000-0000-000000000002',
    okr_id: '10000000-0000-0000-0000-000000000001',
    project_name: 'โครงการสังเคราะห์วัสดุนาโนอัจฉริยะเพื่อการกักเก็บพลังงานสะอาด',
    project_type: 'งานวิจัยนวัตกรรม',
    description: 'พัฒนาแบตเตอรี่ลิเธียมไอออนและเซลล์พลังงานแสงอาทิตย์รุ่นใหม่โดยใช้วัสดุนาโนคาร์บอน',
    main_objective: 'ยื่นจดสิทธิบัตร 1 ผลงาน และส่งเสริมอุตสาหกรรมพลังงานสะอาด',
    sub_objective: 'ทดสอบประสิทธิภาพการกักเก็บประจุและความคงทนในห้องทดลอง',
    department: 'ภาควิชาเคมี',
    start_date: '2024-02-01',
    end_date: '2024-11-30',
    head_of_project: '00000000-0000-0000-0000-000000000005',
    progress_percentage: 72.5,
    budget: 1200000,
    spent_amount: 950000,
    status: 'Delayed',
    bottleneck: 'รอการส่งมอบสารเคมีพิเศษนำเข้าจากประเทศเยอรมนี ล่าช้ากว่ากำหนด 2 สัปดาห์',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
    head: mockUsers[4],
    assignees: [
      {
        project_id: '20000000-0000-0000-0000-000000000002',
        user_id: '00000000-0000-0000-0000-000000000007',
        assigned_role: 'นักวิจัยหลักด้านการทดสอบแล็บ',
        assigned_date: '2024-02-05T00:00:00Z',
        user: mockUsers[6]
      }
    ],
    evidences: []
  },
  {
    project_id: '20000000-0000-0000-0000-000000000003',
    okr_id: '10000000-0000-0000-0000-000000000002',
    project_name: 'โครงการจัดตั้งศูนย์ความเป็นเลิศด้าน Cloud & Quantum Computing',
    project_type: 'พัฒนาโครงสร้างพื้นฐาน',
    description: 'สร้างห้องปฏิบัติการคอมพิวเตอร์สมรรถนะสูงและหลักสูตรฝึกอบรมสำหรับนิสิตระดับปริญญาตรีและบัณฑิตศึกษา',
    main_objective: 'นิสิตผ่านการอบรม 200 คน และได้รับมาตรฐานอุตสาหกรรม',
    sub_objective: 'ติดตั้งเครื่องแม่ข่ายและทำบันทึกความร่วมมือกับบริษัทไอทีชั้นนำ',
    department: 'ภาควิชาวิทยาการคอมพิวเตอร์',
    start_date: '2024-03-01',
    end_date: '2024-10-31',
    head_of_project: '00000000-0000-0000-0000-000000000004',
    progress_percentage: 95,
    budget: 650000,
    spent_amount: 620000,
    status: 'In Progress',
    bottleneck: null,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
    head: mockUsers[3],
    assignees: [
      {
        project_id: '20000000-0000-0000-0000-000000000003',
        user_id: '00000000-0000-0000-0000-000000000006',
        assigned_role: 'ผู้จัดการฝ่ายหลักสูตรการสอน',
        assigned_date: '2024-03-05T00:00:00Z',
        user: mockUsers[5]
      }
    ],
    evidences: []
  },
  {
    project_id: '20000000-0000-0000-0000-000000000004',
    okr_id: '10000000-0000-0000-0000-000000000003',
    project_name: 'โครงการตรวจวัดคุณภาพน้ำและสิ่งแวดล้อมชุมชนลุ่มน้ำภาคกลาง',
    project_type: 'บริการวิชาการเพื่อสังคม',
    description: 'ถ่ายทอดเทคโนโลยีการตรวจวัดสารเคมีและจุลชีววิทยาในแหล่งน้ำชุมชน',
    main_objective: 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นและบริหารจัดการน้ำได้เอง',
    sub_objective: 'จัดทำคู่มือและชุดทดสอบภาคสนามมอบให้ชุมชน',
    department: 'ภาควิชาเคมี',
    start_date: '2024-01-15',
    end_date: '2024-09-30',
    head_of_project: '00000000-0000-0000-0000-000000000005',
    progress_percentage: 100,
    budget: 350000,
    spent_amount: 350000,
    status: 'Completed',
    bottleneck: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    head: mockUsers[4],
    assignees: [
      {
        project_id: '20000000-0000-0000-0000-000000000004',
        user_id: '00000000-0000-0000-0000-000000000007',
        assigned_role: 'ผู้ประสานงานภาคสนามและวิทยากร',
        assigned_date: '2024-01-20T00:00:00Z',
        user: mockUsers[6]
      }
    ],
    evidences: [
      {
        evidence_id: '30000000-0000-0000-0000-000000000004',
        project_id: '20000000-0000-0000-0000-000000000004',
        uploaded_by: '00000000-0000-0000-0000-000000000007',
        file_name: 'water_quality_community_report_final.pdf',
        file_path: 'https://example.com/files/water_report.pdf',
        file_size: 5840200,
        description: 'รายงานสรุปผลการตรวจวัดคุณภาพน้ำและใบตอบรับจากชุมชน 5 แห่ง',
        upload_date: '2024-09-28T14:20:00Z'
      }
    ]
  }
]

export const mockDashboardReports: DashboardReport[] = [
  {
    dashboard_id: '40000000-0000-0000-0000-000000000001',
    overall_okr_info: 'สรุปภาพรวมยุทธศาสตร์ OKR ภาควิชาวิทยาการคอมพิวเตอร์: ดำเนินโครงการ AI ด้านพันธุศาสตร์และศูนย์ Cloud Computing บรรลุผลสัมฤทธิ์ร้อยละ 90 มีการส่งมอบระบบต้นแบบและเตรียมตีพิมพ์วารสารสากล 2 ฉบับ พร้อมเปิดศูนย์ฝึกอบรมรองรับนิสิต 200 คนตามเป้าหมาย',
    okr_head_evaluation_score: 92.5,
    head_id: '00000000-0000-0000-0000-000000000004',
    head_name: 'ผศ.ดร.สมชาย ใจดี',
    academic_year: 2567,
    created_at: '2024-08-15T10:00:00Z',
    updated_at: '2024-08-15T10:00:00Z'
  },
  {
    dashboard_id: '40000000-0000-0000-0000-000000000002',
    overall_okr_info: 'สรุปภาพรวมยุทธศาสตร์ OKR ภาควิชาเคมี: ดำเนินโครงการตรวจวัดคุณภาพน้ำชุมชนสำเร็จครบถ้วน 100% ส่วนโครงการสังเคราะห์วัสดุนาโนคาร์บอนเพื่อกักเก็บพลังงานสะอาดคืบหน้า 72.5% รอส่งมอบสารเคมีนำเข้าเพื่อทดสอบขั้นตอนสุดท้าย',
    okr_head_evaluation_score: 86.0,
    head_id: '00000000-0000-0000-0000-000000000005',
    head_name: 'รศ.ดร.นภา สิริกุล',
    academic_year: 2567,
    created_at: '2024-08-20T14:30:00Z',
    updated_at: '2024-08-20T14:30:00Z'
  }
]

export const mockNormalReports: NormalReport[] = [
  {
    report_id: '50000000-0000-0000-0000-000000000001',
    project_id: '20000000-0000-0000-0000-000000000001',
    project_name: 'โครงการพัฒนาระบบ AI สำหรับวิเคราะห์ข้อมูลจีโนมิกส์ทางการแพทย์',
    project_details: 'รายงานสรุปความก้าวหน้าการพัฒนาระบบ AI และชุดทดสอบอัลกอริทึมในการวิเคราะห์ยีนกลายพันธุ์',
    responsible_person_name: 'อ.ดร.กานดา สุขสมบัติ',
    head_name: 'ผศ.ดร.สมชาย ใจดี',
    project_outcome: 'โมเดล AI มีความแม่นยำ 94.2% และเตรียมยื่นตีพิมพ์ฉบับสมบูรณ์ในวารสาร IEEE',
    initial_expected_outcome: 'ตีพิมพ์ในวารสารระดับ Q1 จำนวน 2 บทความ',
    head_evaluation_score: 90.0,
    team_evaluation_score: 88.5,
    created_by: '00000000-0000-0000-0000-000000000004',
    created_at: '2024-08-10T11:00:00Z',
    updated_at: '2024-08-10T11:00:00Z'
  },
  {
    report_id: '50000000-0000-0000-0000-000000000002',
    project_id: '20000000-0000-0000-0000-000000000004',
    project_name: 'โครงการตรวจวัดคุณภาพน้ำและสิ่งแวดล้อมชุมชนลุ่มน้ำภาคกลาง',
    project_details: 'โครงการบริการวิชาการถ่ายทอดเทคโนโลยีการตรวจวัดสารเคมีในแหล่งน้ำแก่ผู้นำชุมชน',
    responsible_person_name: 'ผศ.ดร.อนันต์ แสงทอง',
    head_name: 'รศ.ดr.นภา สิริกุล',
    project_outcome: 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นและบริหารจัดการน้ำได้จริง มีหนังสือตอบรับครบ 100%',
    initial_expected_outcome: 'ชุมชนเป้าหมาย 5 แห่งสามารถตรวจวิเคราะห์เบื้องต้นและบริหารจัดการน้ำได้เอง',
    head_evaluation_score: 98.0,
    team_evaluation_score: 96.0,
    created_by: '00000000-0000-0000-0000-000000000005',
    created_at: '2024-08-25T09:15:00Z',
    updated_at: '2024-08-25T09:15:00Z'
  }
]

export const mockProjectAssignments: ProjectAssignment[] = [
  {
    assignment_id: '60000000-0000-0000-0000-000000000001',
    project_id: '20000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000004',
    role_type: 'Head',
    assigned_by: '00000000-0000-0000-0000-000000000002',
    created_at: '2024-01-10T00:00:00Z'
  },
  {
    assignment_id: '60000000-0000-0000-0000-000000000002',
    project_id: '20000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000006',
    role_type: 'Member',
    assigned_by: '00000000-0000-0000-0000-000000000004',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    assignment_id: '60000000-0000-0000-0000-000000000003',
    project_id: '20000000-0000-0000-0000-000000000004',
    user_id: '00000000-0000-0000-0000-000000000005',
    role_type: 'Head',
    assigned_by: '00000000-0000-0000-0000-000000000002',
    created_at: '2024-01-10T00:00:00Z'
  },
  {
    assignment_id: '60000000-0000-0000-0000-000000000004',
    project_id: '20000000-0000-0000-0000-000000000004',
    user_id: '00000000-0000-0000-0000-000000000007',
    role_type: 'Member',
    assigned_by: '00000000-0000-0000-0000-000000000005',
    created_at: '2024-01-20T00:00:00Z'
  }
]

export const mockEvidenceSubmissions: EvidenceSubmission[] = [
  {
    evidence_id: '30000000-0000-0000-0000-000000000001',
    project_id: '20000000-0000-0000-0000-000000000001',
    sender_id: '00000000-0000-0000-0000-000000000006',
    file_name: 'ai_genomics_model_benchmark_report.pdf',
    file_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_type: 'application/pdf',
    submitted_at: '2024-09-15T10:30:00Z'
  },
  {
    evidence_id: '30000000-0000-0000-0000-000000000002',
    project_id: '20000000-0000-0000-0000-000000000001',
    sender_id: '00000000-0000-0000-0000-000000000006',
    file_name: 'lab_experiment_photo_validation.jpg',
    file_path: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80',
    file_type: 'image/jpeg',
    submitted_at: '2024-09-20T16:45:00Z'
  },
  {
    evidence_id: '30000000-0000-0000-0000-000000000004',
    project_id: '20000000-0000-0000-0000-000000000004',
    sender_id: '00000000-0000-0000-0000-000000000007',
    file_name: 'water_quality_community_report_final.pdf',
    file_path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    file_type: 'application/pdf',
    submitted_at: '2024-09-28T14:20:00Z'
  }
]

export const mockEvaluations: Evaluation[] = [
  {
    eval_id: '70000000-0000-0000-0000-000000000001',
    report_id: '50000000-0000-0000-0000-000000000001',
    dashboard_id: null,
    evaluator_id: '00000000-0000-0000-0000-000000000004',
    head_score: 5,
    team_score: 4,
    created_at: '2024-08-15T12:00:00Z'
  },
  {
    eval_id: '70000000-0000-0000-0000-000000000002',
    report_id: '50000000-0000-0000-0000-000000000002',
    dashboard_id: null,
    evaluator_id: '00000000-0000-0000-0000-000000000005',
    head_score: 5,
    team_score: 5,
    created_at: '2024-08-26T10:00:00Z'
  },
  {
    eval_id: '70000000-0000-0000-0000-000000000003',
    report_id: null,
    dashboard_id: '40000000-0000-0000-0000-000000000001',
    evaluator_id: '00000000-0000-0000-0000-000000000002',
    head_score: 5,
    team_score: null,
    created_at: '2024-08-16T09:00:00Z'
  }
]

export const mockDepartments = [
  'ทั้งหมด',
  'ภาควิชาวิทยาการคอมพิวเตอร์',
  'ภาควิชาเคมี',
  'ภาควิชาชีววิทยา',
  'ภาควิชาฟิสิกส์',
  'ภาควิชาคณิตศาสตร์',
  'สำนักงานคณบดี'
]
