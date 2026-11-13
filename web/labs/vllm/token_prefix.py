#!/usr/bin/env python3
"""Optional tokenizer-only check; requires the GPU route's transformers dependency."""
from transformers import AutoTokenizer
from lab import workload
MODEL='Qwen/Qwen2.5-0.5B-Instruct'
REVISION='7ae557604adf67be50417f59c2c2f167def9a775'
tokenizer=AutoTokenizer.from_pretrained(MODEL,revision=REVISION)
rows=workload()
def encode(row):
    return tokenizer.apply_chat_template([{'role':'user','content':row['prompt']}],tokenize=True,add_generation_prompt=True)
a,b,c=map(encode,[rows[0],rows[2],rows[1]])
def common(x,y):
    n=0
    for u,v in zip(x,y):
        if u!=v:break
        n+=1
    return n
print({'evidence':'design','revision':REVISION,'shared_pair_tokens':common(a,b),'different_pair_prefix_tokens':common(a,c),'first_prompt_tokens':len(a),'note':'Template tokens may form a prefix even for different text. This does not measure cache hits.'})
