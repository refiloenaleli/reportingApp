import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

function normalizeSnapshot(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data.createdAt && typeof data.createdAt.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || null,
        updatedAt:
          data.updatedAt && typeof data.updatedAt.toDate === 'function'
            ? data.updatedAt.toDate().toISOString()
            : data.updatedAt || null,
      };
    })
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

export function subscribeToReports(profile, onData, onError) {
  if (!profile?.uid || !profile?.role) {
    onData([]);
    return () => {};
  }

  if (profile.role === 'student') {
    onData([]);
    return () => {};
  }

  let reportsQuery = collection(db, 'reports');

  if (profile.role === 'lecturer') {
    reportsQuery = query(reportsQuery, where('facultyName', '==', profile.facultyName));
    if (profile.streamName) {
      reportsQuery = query(reportsQuery, where('stream', '==', profile.streamName));
    }
  } else if (profile.role === 'prl') {
    reportsQuery = query(reportsQuery, where('facultyName', '==', profile.facultyName));
    if (profile.streamName) {
      reportsQuery = query(reportsQuery, where('stream', '==', profile.streamName));
    }
  } else {
    reportsQuery = query(reportsQuery, orderBy('createdAt', 'desc'));
  }

  return onSnapshot(
    reportsQuery,
    (snapshot) => onData(normalizeSnapshot(snapshot)),
    onError
  );
}

export function subscribeToModuleRecords(moduleKey, profile, onData, onError) {
  if (!moduleKey || !profile?.uid || !profile?.role) {
    onData([]);
    return () => {};
  }

  let recordsQuery = collection(db, moduleKey);

  if (profile.role === 'student' || profile.role === 'lecturer') {
    if (moduleKey === 'lectures') {
      if (profile.role !== 'lecturer') {
        onData([]);
        return () => {};
      }
      recordsQuery = query(recordsQuery, where('lecturerEmail', '==', String(profile.email || '').toLowerCase()));
    } else if (moduleKey === 'courses') {
      onData([]);
      return () => {};
    } else if (moduleKey === 'classes' && profile.role === 'student') {
      recordsQuery = query(recordsQuery, where('facultyName', '==', profile.facultyName));
      if (profile.streamName) {
        recordsQuery = query(recordsQuery, where('stream', '==', profile.streamName));
      }
    } else if (moduleKey === 'attendance' && profile.role === 'lecturer') {
      recordsQuery = query(recordsQuery, where('facultyName', '==', profile.facultyName));
      if (profile.streamName) {
        recordsQuery = query(recordsQuery, where('stream', '==', profile.streamName));
      }
    } else if (moduleKey === 'ratings' && profile.role === 'lecturer') {
      recordsQuery = query(recordsQuery, where('facultyName', '==', profile.facultyName));
    } else if (moduleKey === 'attendance' && profile.role === 'student') {
      recordsQuery = query(recordsQuery, where('studentEmail', '==', String(profile.email || '').toLowerCase()));
    } else if (moduleKey === 'monitoring' && profile.role === 'student') {
      recordsQuery = query(recordsQuery, where('facultyName', '==', profile.facultyName));
      if (profile.streamName) {
        recordsQuery = query(recordsQuery, where('stream', '==', profile.streamName));
      }
    } else if (moduleKey === 'monitoring' && profile.role === 'lecturer') {
      recordsQuery = query(recordsQuery, where('createdBy', '==', profile.uid));
    } else {
      recordsQuery = query(recordsQuery, where('createdBy', '==', profile.uid));
    }
  } else if (profile.role === 'prl') {
    if (['courses', 'lectures', 'classes', 'attendance', 'monitoring', 'ratings'].includes(moduleKey)) {
      recordsQuery = query(recordsQuery, where('facultyName', '==', profile.facultyName));
      if (profile.streamName && ['courses', 'lectures', 'classes', 'attendance', 'monitoring'].includes(moduleKey)) {
        recordsQuery = query(recordsQuery, where('stream', '==', profile.streamName));
      }
    }
  }

  return onSnapshot(
    recordsQuery,
    (snapshot) => onData(normalizeSnapshot(snapshot)),
    onError
  );
}

export function subscribeToNotifications(profile, onData, onError) {
  if (!profile?.uid) {
    onData([]);
    return () => {};
  }

  const personalQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', profile.uid)
  );
  const broadcastQuery = query(
    collection(db, 'notifications'),
    where('audience', '==', 'all')
  );

  let personalRecords = [];
  let broadcastRecords = [];

  const publish = () => {
    const merged = [...personalRecords, ...broadcastRecords].filter(
      (entry, index, list) => list.findIndex((candidate) => candidate.id === entry.id) === index
    );
    onData(merged.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)));
  };

  const unsubscribePersonal = onSnapshot(
    personalQuery,
    (snapshot) => {
      personalRecords = normalizeSnapshot(snapshot);
      publish();
    },
    onError
  );

  const unsubscribeBroadcast = onSnapshot(
    broadcastQuery,
    (snapshot) => {
      broadcastRecords = normalizeSnapshot(snapshot);
      publish();
    },
    onError
  );

  return () => {
    unsubscribePersonal();
    unsubscribeBroadcast();
  };
}
