import { getModuleRecords, getReports } from './api';
import { loadLecturers } from './users';

function percentage(part, total) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function sortByDate(records, key = 'createdAt') {
  return [...records].sort((left, right) => new Date(right[key] || 0) - new Date(left[key] || 0));
}

function buildAlerts({ reports = [], attendance = [], monitoring = [] }) {
  const alerts = [];

  reports.forEach((report) => {
    const attendanceRate = percentage(report.actualStudentsPresent, report.totalRegisteredStudents);
    if (attendanceRate && attendanceRate < 60) {
      alerts.push({
        title: `Low attendance in ${report.courseCode}`,
        subtitle: `${attendanceRate}% attendance recorded`,
        status: 'pending',
      });
    }
  });

  monitoring
    .filter((entry) => String(entry.status || '').toLowerCase() !== 'closed')
    .forEach((entry) => {
      alerts.push({
        title: entry.moduleName,
        subtitle: entry.notes,
        status: entry.status,
      });
    });

  const absentCount = attendance.filter(
    (record) => String(record.attendanceStatus || '').toLowerCase() === 'absent'
  ).length;

  if (absentCount) {
    alerts.push({
      title: 'Attendance concern',
      subtitle: `${absentCount} absence records need attention`,
      status: 'open',
    });
  }

  return alerts.slice(0, 4);
}

export async function loadDashboardData(profile) {
  const role = profile?.role || '';

  if (!role) {
    return null;
  }

  const requests = {
    reports: ['lecturer', 'prl', 'pl'].includes(role) ? getReports() : Promise.resolve({ reports: [] }),
    monitoring: getModuleRecords('monitoring').catch(() => ({ records: [] })),
    ratings: getModuleRecords('ratings').catch(() => ({ records: [] })),
    attendance: getModuleRecords('attendance').catch(() => ({ records: [] })),
    lectures: getModuleRecords('lectures').catch(() => ({ records: [] })),
    classes: getModuleRecords('classes').catch(() => ({ records: [] })),
    courses: getModuleRecords('courses').catch(() => ({ records: [] })),
    lecturers: loadLecturers(profile).then((users) => ({ users })).catch(() => ({ users: [] })),
  };

  const [reportsResponse, monitoringResponse, ratingsResponse, attendanceResponse, lecturesResponse, classesResponse, coursesResponse, lecturersResponse] =
    await Promise.all([
      requests.reports,
      requests.monitoring,
      requests.ratings,
      requests.attendance,
      requests.lectures,
      requests.classes,
      requests.courses,
      requests.lecturers,
    ]);

  const reports = reportsResponse.reports || [];
  const monitoring = monitoringResponse.records || [];
  const ratings = ratingsResponse.records || [];
  const attendance = attendanceResponse.records || [];
  const lectures = lecturesResponse.records || [];
  const classes = classesResponse.records || [];
  const courses = coursesResponse.records || [];
  const lecturers = lecturersResponse.users || [];

  const alerts = buildAlerts({ reports, attendance, monitoring });
  const recentReports = sortByDate(reports).slice(0, 4);
  const recentMonitoring = sortByDate(monitoring).slice(0, 4);
  const recentAttendance = sortByDate(attendance).slice(0, 4);

  if (role === 'student') {
    const present = attendance.filter((record) => String(record.attendanceStatus || '').toLowerCase() === 'present').length;
    const late = attendance.filter((record) => String(record.attendanceStatus || '').toLowerCase() === 'late').length;
    return {
      heroTitle: 'Student overview',
      summaryCards: [
        { label: 'Attendance Rate', value: `${percentage(present, attendance.length || 1)}%`, note: `${present} present records`, tone: 'info' },
        { label: 'Upcoming Classes', value: classes.length, note: 'Classes visible for your stream', tone: 'accent' },
        { label: 'Warnings', value: alerts.length, note: 'Attendance or monitoring concerns', tone: alerts.length ? 'warning' : 'success' },
      ],
      primarySection: {
        title: 'Upcoming classes',
        items: classes.slice(0, 4),
      },
      secondarySection: {
        title: 'Monitoring feedback',
        items: recentMonitoring,
      },
      alerts,
      extra: {
        late,
        attendanceTotal: attendance.length,
        ratings: ratings.length,
      },
    };
  }

  if (role === 'lecturer') {
    const submittedThisWeek = reports.filter((report) => String(report.weekOfReporting || '').trim()).length;
    const pendingFeedback = reports.filter((report) => !String(report.prlFeedback || '').trim()).length;
    return {
      heroTitle: 'Lecturer control room',
      summaryCards: [
        { label: "Today's Classes", value: lectures.length, note: 'Assigned teaching slots', tone: 'info' },
        { label: 'Reports This Week', value: submittedThisWeek, note: 'Lecture reports submitted', tone: 'accent' },
        { label: 'Awaiting Feedback', value: pendingFeedback, note: 'Reports still pending PRL review', tone: pendingFeedback ? 'warning' : 'success' },
      ],
      primarySection: {
        title: 'Today and upcoming classes',
        items: lectures.slice(0, 4),
      },
      secondarySection: {
        title: 'Recent report activity',
        items: recentReports,
      },
      alerts,
      extra: {
        attendanceRecords: attendance.length,
      },
    };
  }

  if (role === 'prl') {
    const pendingReviews = reports.filter((report) => !String(report.prlFeedback || '').trim());
    const reviewedReports = reports.filter((report) => String(report.prlFeedback || '').trim()).length;
    return {
      heroTitle: 'Principal Lecturer review desk',
      summaryCards: [
        { label: 'Awaiting Review', value: pendingReviews.length, note: 'Reports that still need feedback', tone: pendingReviews.length ? 'warning' : 'success' },
        { label: 'Reviewed Reports', value: reviewedReports, note: 'Feedback completed in your stream', tone: 'accent' },
        { label: 'Stream Courses', value: courses.length, note: 'Courses under your supervision', tone: 'info' },
      ],
      primarySection: {
        title: 'Review queue',
        items: pendingReviews.slice(0, 4),
      },
      secondarySection: {
        title: 'Monitoring watchlist',
        items: recentMonitoring,
      },
      alerts,
      extra: {
        classes: classes.length,
      },
    };
  }

  const approvedLikeReports = reports.filter((report) => String(report.prlFeedback || '').trim()).length;
  return {
    heroTitle: 'Program Leader faculty overview',
    summaryCards: [
      { label: 'Faculty Courses', value: courses.length, note: 'Configured teaching allocations', tone: 'info' },
      { label: 'Lecturers', value: lecturers.length, note: 'Active lecturer accounts', tone: 'accent' },
      { label: 'Reviewed Reports', value: approvedLikeReports, note: 'Reports with PRL feedback', tone: approvedLikeReports ? 'success' : 'warning' },
    ],
    primarySection: {
      title: 'Lecturer assignments',
      items: lecturers.slice(0, 4),
    },
    secondarySection: {
      title: 'Recent faculty reports',
      items: recentReports,
    },
    alerts,
    extra: {
      lectures: lectures.length,
      monitoring: monitoring.length,
    },
  };
}
