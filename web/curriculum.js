"use strict";

// Required means required in this community's suggested learning path.
const Curriculum = (() => {
  function classify(courseId, paths, selectedPath = "") {
    const path = paths.find(item => item.id === selectedPath);
    const requiredFor = paths.filter(item => item.requiredCourses.includes(courseId));
    return {
      kind: (path ? path.requiredCourses.includes(courseId) : requiredFor.length > 0) ? "required" : "elective",
      common: paths.length > 0 && requiredFor.length === paths.length,
      requiredFor: requiredFor.map(item => item.id),
      applicable: !path || path.courses.includes(courseId)
    };
  }
  return { classify };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Curriculum;
