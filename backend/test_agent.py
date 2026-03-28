import sys
sys.path.insert(0, '.')
import agent

agent.init()
print()
print("=== TEST CONVERSATIONS ===")

# Full flow
for sid, msg in [('s1','hello'),('s1','Sarah'),('s1','28'),('s1','I have headache fever and body ache for 2 days')]:
    r = agent.agent_reply(sid, msg)
    stage = r['stage']
    reply = r['reply'][:200]
    print(f"[{stage}] {reply}")
    if r.get('predictions'):
        p = r['predictions'][0]
        print(f"  -> {p['disease']} ({p['confidence']}%)")
        print(f"     meds: {p['medications'][:2]}")
        print(f"     diet: {p['diets'][:2]}")
        print(f"     workouts: {p['workouts'][:2]}")
    print()

# Home remedy
r = agent.agent_reply('s2', 'what can I do for a sore throat at home')
print("REMEDY:", r['reply'][:400])
print()

# Wellness
r = agent.agent_reply('s3', 'give me some sleep tips')
print("WELLNESS:", r['reply'][:300])
print()

# Mental health
r = agent.agent_reply('s4', 'I feel really depressed and anxious')
print("MENTAL:", r['reply'][:300])
print()

# Health check
import json
print("HEALTH:", json.dumps({k:v for k,v in {'diseases':len(agent.DISEASES),'symptoms':len(agent.FEATURES),'medications':len(agent.MEDICATIONS),'diets':len(agent.DIETS),'workouts':len(agent.WORKOUTS),'remedies':len(agent.HOME_REMEDIES)}.items()}))
