export const FACULTIES = [
  'Information Technology',
  'Design',
  'Architecture',
  'Communications',
  'Tourism',
];

export const STREAMS = [
  'Software Engineering with Multimedia',
  'Business Information Systems',
  'Networking',
  'Multimedia Computing',
  'General',
];

export const ROLE_LABELS = {
  student: 'Student',
  lecturer: 'Lecturer',
  prl: 'Principal Lecturer',
  pl: 'Program Leader',
};

export const MODULE_DEFINITIONS = {
  monitoring: {
    title: 'Monitoring',
    fields: [
      { key: 'facultyName', label: 'Faculty', type: 'select', options: FACULTIES },
      { key: 'stream', label: 'Stream', type: 'select', options: STREAMS },
      { key: 'moduleName', label: 'Issue Title' },
      { key: 'entryDate', label: 'Entry Date', placeholder: '2026-05-03' },
      { key: 'status', label: 'Status', type: 'select', options: ['Open', 'In Progress', 'Closed'] },
      { key: 'notes', label: 'Notes', multiline: true },
    ],
    searchFields: ['facultyName', 'stream', 'moduleName', 'status', 'notes'],
    getTitle: (record) => record.moduleName,
    getMeta: (record) => `${record.facultyName} | ${record.status}`,
    getLines: (record) => [record.stream, record.entryDate, record.notes],
  },
  ratings: {
    title: 'Rating',
    fields: [
      { key: 'facultyName', label: 'Faculty', type: 'select', options: FACULTIES },
      { key: 'targetName', label: 'Target Name' },
      { key: 'targetEmail', label: 'Target Email', keyboardType: 'email-address', autoCapitalize: 'none' },
      { key: 'targetRole', label: 'Target Role', type: 'select', options: ['Lecturer', 'Class', 'Course'] },
      { key: 'targetStream', label: 'Stream', type: 'select', options: STREAMS },
      { key: 'courseCode', label: 'Course Code', autoCapitalize: 'characters' },
      { key: 'ratingScore', label: 'Rating Score', type: 'select', options: ['1', '2', '3', '4', '5'] },
      { key: 'comment', label: 'Comment', multiline: true },
    ],
    searchFields: ['facultyName', 'targetName', 'targetEmail', 'targetRole', 'courseCode', 'comment'],
    getTitle: (record) => `${record.targetName} (${record.targetRole})`,
    getMeta: (record) => `${record.courseCode} | Score ${record.ratingScore}`,
    getLines: (record) => [record.targetEmail, record.comment],
  },
  attendance: {
    title: 'Attendance',
    fields: [
      { key: 'facultyName', label: 'Faculty', type: 'select', options: FACULTIES },
      { key: 'stream', label: 'Stream', type: 'select', options: STREAMS },
      { key: 'className', label: 'Class Name' },
      { key: 'courseCode', label: 'Course Code', autoCapitalize: 'characters' },
      { key: 'attendanceDate', label: 'Attendance Date', placeholder: '2026-05-03' },
      { key: 'studentName', label: 'Student Name' },
      { key: 'studentEmail', label: 'Student Email', keyboardType: 'email-address', autoCapitalize: 'none' },
      { key: 'studentId', label: 'Student ID' },
      { key: 'attendanceStatus', label: 'Attendance Status', type: 'select', options: ['Present', 'Late', 'Absent'] },
    ],
    searchFields: ['facultyName', 'stream', 'className', 'courseCode', 'studentName', 'studentEmail', 'studentId', 'attendanceStatus'],
    getTitle: (record) => `${record.studentName} - ${record.className}`,
    getMeta: (record) => `${record.courseCode} | ${record.attendanceStatus}`,
    getLines: (record) => [record.stream, record.attendanceDate, record.studentEmail],
  },
  classes: {
    title: 'Classes',
    fields: [
      { key: 'facultyName', label: 'Faculty', type: 'select', options: FACULTIES },
      { key: 'stream', label: 'Stream', type: 'select', options: STREAMS },
      { key: 'className', label: 'Class Name' },
      { key: 'courseName', label: 'Course Name' },
      { key: 'courseCode', label: 'Course Code', autoCapitalize: 'characters' },
      { key: 'semester', label: 'Semester' },
      { key: 'venue', label: 'Venue' },
      { key: 'scheduledTime', label: 'Scheduled Time', placeholder: '08:00 - 10:00' },
    ],
    searchFields: ['facultyName', 'stream', 'className', 'courseName', 'courseCode', 'venue'],
    getTitle: (record) => `${record.className} - ${record.courseCode}`,
    getMeta: (record) => `${record.courseName} | ${record.semester}`,
    getLines: (record) => [
      record.assignedLecturerName ? `Lecturer: ${record.assignedLecturerName}` : record.stream,
      record.venue,
      record.scheduledTime,
    ],
  },
  courses: {
    title: 'Courses',
    fields: [
      { key: 'facultyName', label: 'Faculty', type: 'select', options: FACULTIES },
      { key: 'courseName', label: 'Course Name' },
      { key: 'courseCode', label: 'Course Code', autoCapitalize: 'characters' },
      { key: 'className', label: 'Class Name' },
      { key: 'semester', label: 'Semester' },
      { key: 'assignedLecturerName', label: 'Assigned Lecturer' },
      { key: 'assignedLecturerEmail', label: 'Lecturer Email', keyboardType: 'email-address', autoCapitalize: 'none' },
      { key: 'stream', label: 'Stream', type: 'select', options: STREAMS },
      { key: 'totalRegisteredStudents', label: 'Registered Students', keyboardType: 'numeric' },
      { key: 'venue', label: 'Venue' },
      { key: 'scheduledTime', label: 'Scheduled Time', placeholder: '08:00 - 10:00' },
    ],
    searchFields: ['facultyName', 'courseName', 'courseCode', 'className', 'assignedLecturerName', 'stream'],
    getTitle: (record) => `${record.courseCode} - ${record.courseName}`,
    getMeta: (record) => `${record.facultyName} | ${record.stream} | ${record.className}`,
    getLines: (record) => [
      record.assignedLecturerName,
      record.stream,
      `${record.venue} | ${record.scheduledTime}`,
      `Registered Students: ${record.totalRegisteredStudents}`,
    ],
  },
  lectures: {
    title: 'Lectures',
    fields: [
      { key: 'facultyName', label: 'Faculty', type: 'select', options: FACULTIES },
      { key: 'stream', label: 'Stream', type: 'select', options: STREAMS },
      { key: 'lecturerName', label: 'Lecturer Name' },
      { key: 'lecturerEmail', label: 'Lecturer Email', keyboardType: 'email-address', autoCapitalize: 'none' },
      { key: 'courseCode', label: 'Course Code', autoCapitalize: 'characters' },
      { key: 'courseName', label: 'Course Name' },
      { key: 'className', label: 'Class Name' },
      { key: 'semester', label: 'Semester' },
      { key: 'totalRegisteredStudents', label: 'Registered Students', keyboardType: 'numeric' },
      { key: 'venue', label: 'Venue' },
      { key: 'scheduledTime', label: 'Scheduled Time', placeholder: '08:00 - 10:00' },
    ],
    searchFields: ['facultyName', 'stream', 'lecturerName', 'lecturerEmail', 'courseCode', 'courseName', 'className', 'venue'],
    getTitle: (record) => `${record.lecturerName} - ${record.courseCode}`,
    getMeta: (record) => `${record.className} | ${record.scheduledTime}`,
    getLines: (record) => [record.stream, record.lecturerEmail, record.courseName, `${record.venue} | ${record.totalRegisteredStudents}`],
  },
};

export const ROLE_MODULES = {
  student: [
    { key: 'notifications', label: 'Notifications', create: false, special: 'notifications' },
    { key: 'monitoring', label: 'Monitoring', create: false, editScope: false, deleteScope: false },
    { key: 'ratings', label: 'Rating', create: true, editScope: 'own', deleteScope: 'own' },
    { key: 'attendance', label: 'Attendance', create: false, editScope: false, deleteScope: false },
  ],
  lecturer: [
    { key: 'notifications', label: 'Notifications', create: false, special: 'notifications' },
    { key: 'lectures', label: 'Classes', create: false, editScope: false, deleteScope: false },
    { key: 'reports', label: 'Reports', create: true, special: 'reports' },
    { key: 'monitoring', label: 'Monitoring', create: true, editScope: 'own', deleteScope: 'own' },
    { key: 'ratings', label: 'Rating', create: true, editScope: 'own', deleteScope: 'own' },
    { key: 'attendance', label: 'Student Attendance', create: true, editScope: 'own', deleteScope: 'own' },
  ],
  prl: [
    { key: 'notifications', label: 'Notifications', create: false, special: 'notifications' },
    { key: 'courses', label: 'Courses', create: false, editScope: false, deleteScope: false },
    { key: 'lectures', label: 'Lectures', create: false, editScope: false, deleteScope: false },
    { key: 'reports', label: 'Reports', create: false, special: 'reports' },
    { key: 'monitoring', label: 'Monitoring', create: true, editScope: 'faculty', deleteScope: false },
    { key: 'ratings', label: 'Rating', create: true, editScope: 'own', deleteScope: 'own' },
    { key: 'classes', label: 'Classes', create: false, editScope: false, deleteScope: false },
  ],
  pl: [
    { key: 'notifications', label: 'Notifications', create: false, special: 'notifications' },
    { key: 'courses', label: 'Courses', create: true, editScope: 'all', deleteScope: 'all' },
    { key: 'reports', label: 'Reports', create: false, special: 'reports' },
    { key: 'feedbackList', label: 'Feedback From PRL', create: false, special: 'feedbackList' },
    { key: 'monitoring', label: 'Monitoring', create: true, editScope: 'all', deleteScope: 'all' },
    { key: 'classes', label: 'Classes', create: true, editScope: 'all', deleteScope: 'all' },
    { key: 'lectures', label: 'Lectures', create: true, editScope: 'all', deleteScope: 'all' },
    { key: 'ratings', label: 'Rating', create: true, editScope: 'own', deleteScope: 'own' },
  ],
};

export function getRoleModules(role) {
  return ROLE_MODULES[role] || [];
}

export function getModuleDefinition(moduleKey) {
  return MODULE_DEFINITIONS[moduleKey];
}

export function hasRecordScope(scope, record, profile) {
  if (!scope) {
    return false;
  }

  if (scope === 'all') {
    return true;
  }

  if (scope === 'own') {
    return record.createdBy === profile?.uid;
  }

  if (scope === 'faculty') {
    return (
      record.facultyName === profile?.facultyName &&
      (!profile?.streamName || !record.stream || record.stream === profile.streamName)
    );
  }

  return false;
}
