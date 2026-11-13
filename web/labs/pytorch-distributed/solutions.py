"""Reference only; passing this is not your own work."""
def weighted_gradient(means, counts):
    if not means or len(means)!=len(counts) or any(type(n) is not int or n<=0 for n in counts):raise ValueError('positive integer counts required')
    return sum(g*n for g,n in zip(means,counts))/sum(counts)
