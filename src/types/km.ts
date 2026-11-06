export type Role = 'Member' | 'Lead' | 'Manager' | 'Admin';
export type KmStatus = 'C' | 'P' | 'N';

export interface Member { id: string; name: string; email: string; team: string | null; role: Role }
export interface ModuleRec {
  id: string; product: string; name: string; complexity: number; active: boolean;
  passScore: number; mcWeight: number; essayWeight: number;
}
/** สถานะหลังคำนวณแล้ว: P ที่สอบ Post ผ่านถูกเปลี่ยนเป็น N แล้ว */
export interface MemberModule { memberId: string; moduleId: string; status: KmStatus }
export interface CourseRec {
  id: string; moduleId: string; name: string; instructorId: string | null; instructorName: string | null;
  courseStatus: string; examStatus: string; preTestDate: string | null; trainDate: string | null; postTestDate: string | null;
}
export interface ResultRec {
  memberId: string; moduleId: string; testType: 'Pre' | 'Post'; attempt: number;
  mc: number; essay: number | null; total: number | null; passed: boolean; testDate: string;
}
export interface Settings { passScore: number; knowHigh: number; knowMid: number; maxAttempts: number }
export interface UserRec { email: string; memberId: string; salt: string; hash: string }

export interface Bundle {
  generatedAt: string; settings: Settings; users: UserRec[]; members: Member[];
  modules: ModuleRec[]; memberModules: MemberModule[]; courses: CourseRec[]; results: ResultRec[];
}
/** ข้อมูลที่กรองตามสิทธิ์แล้ว (ไม่มีข้อมูลผู้ใช้/รหัสผ่าน) */
export type Scoped = Omit<Bundle, 'users'>;
export interface SessionUser { memberId: string; name: string; email: string; role: Role }
