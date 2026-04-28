export type Role = 'admin' | 'teacher' | 'student';

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
  tenant: string;
};

export const MOCK_USERS = {
  admin:   { id: 'admin-demo',   name: 'Admin Demo',     role: 'admin'   as Role },
  teacher: { id: 'teacher-demo', name: 'Professor João', role: 'teacher' as Role },
  student: { id: 'student-demo', name: 'Aluno Demo',     role: 'student' as Role },
};
