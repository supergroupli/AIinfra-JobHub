"""Fill these functions yourself. Run: python3 check_exercises.py.

Contracts and independent test cases are in check_exercises.py. A worked solution
is in reference.py; read it after writing and testing your own implementation.
"""


def masked_mean(values, mask):
    """Mean of values whose mask is 1; reject mismatched lengths or empty selection."""
    raise NotImplementedError('Day 5: implement response-only reduction')


def accept_trajectory(behavior_version, trainer_version, max_lag):
    """Accept iff version lag lies inclusively between zero and max_lag."""
    raise NotImplementedError('Day 12: reject stale and future trajectories')


def unique_rewards(events):
    """Return rewards once per event ID, in first-seen order; conflicting retries fail."""
    raise NotImplementedError('Day 14: make retry delivery idempotent')
