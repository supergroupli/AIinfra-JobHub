"""Optional Python version of the single-window teaching queue from lesson 9."""
import argparse


def queue_times(ahead, pieces):
    wait = ahead * 2
    first = wait + 1
    full = wait + pieces
    return first, full


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ahead", type=int, choices=(0, 1, 2), default=0,
                        help="people ahead, each using the window for two seconds")
    parser.add_argument("--pieces", type=int, choices=(1, 3, 5), default=3,
                        help="number of pieces in your reply, one per second")
    args = parser.parse_args()
    first, full = queue_times(args.ahead, args.pieces)
    print(f"first={first} s, full={full} s")
