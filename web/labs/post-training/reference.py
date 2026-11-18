"""Worked answers. Compare only after attempting exercises.py."""


def masked_mean(values, mask):
    if len(values) != len(mask) or not mask or any(x not in (0,1) for x in mask) or not sum(mask):
        raise ValueError('invalid mask')
    return sum(value for value, selected in zip(values,mask) if selected) / sum(mask)


def accept_trajectory(behavior_version, trainer_version, max_lag):
    return 0 <= trainer_version - behavior_version <= max_lag


def unique_rewards(events):
    seen = {}
    for ident, reward in events:
        if ident in seen and seen[ident] != reward:
            raise ValueError('conflicting retry')
        seen[ident] = reward
    return list(seen.values())
