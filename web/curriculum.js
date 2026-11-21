"use strict";

// Required means required in this community's suggested learning path.
const Curriculum = (() => {
  function classify(course, paths, selectedPath = "") {
    if (course?.format === "primer") {
      return {kind: "primer", common: false, requiredFor: [], applicable: true};
    }
    const courseId = course?.id ?? course;
    const path = paths.find(item => item.id === selectedPath);
    const requiredFor = paths.filter(item => item.requiredCourses.includes(courseId));
    return {
      kind: (path ? path.requiredCourses.includes(courseId) : requiredFor.length > 0) ? "required" : "elective",
      common: paths.length > 0 && requiredFor.length === paths.length,
      requiredFor: requiredFor.map(item => item.id),
      applicable: !path || path.courses.includes(courseId)
    };
  }
  function coursesForPath(courses, paths, selectedPath = "", kind = "") {
    const path = paths.find(item => item.id === selectedPath);
    const entries = courses.map(course => ({course, requirement: classify(course, paths, selectedPath)}));
    const matches = entries.filter(({requirement}) => requirement.applicable && (!kind || requirement.kind === kind));
    if (path) matches.sort((a, b) => path.courses.indexOf(a.course.id) - path.courses.indexOf(b.course.id));
    return matches;
  }
  function daysFor(courseIds, courses) {
    return courseIds.reduce((sum,id) => sum + (courses.find(course=>course.id===id)?.steps.length || 0),0);
  }
  return { classify, coursesForPath, daysFor };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Curriculum;
