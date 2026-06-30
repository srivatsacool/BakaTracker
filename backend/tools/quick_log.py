import re
from typing import List, Dict, Any
from tools.habits import log_habit, increment_habit, set_habit_value, get_habits

def quick_log(text: str) -> str:
    """
    Parses natural language shorthand (e.g., 'Gym done. Read 12 pages. Sleep 8.') 
    to automatically log checkboxes, counters, or numeric habit logs in a single call.
    """
    habits = get_habits()
    if not habits:
        return "Error: No habits configured to log against."
        
    # Split text into sentences/statements
    statements = re.split(r'[.,;\n]|\band\b', text)
    statements = [s.strip() for s in statements if s.strip()]
    
    results = []
    
    for stmt in statements:
        stmt_lower = stmt.lower()
        
        # Find best matching habit by keyword
        best_habit = None
        best_score = 0
        
        for h in habits:
            name_lower = h.get("name", "").lower()
            # Simple scoring: count overlapping words or substring match
            score = 0
            if name_lower in stmt_lower:
                score = len(name_lower)
            else:
                # Count matching tokens
                name_tokens = set(re.findall(r'\w+', name_lower))
                stmt_tokens = set(re.findall(r'\w+', stmt_lower))
                overlap = name_tokens.intersection(stmt_tokens)
                score = len(overlap) * 2
                
            if score > best_score:
                best_score = score
                best_habit = h
                
        if not best_habit or best_score == 0:
            results.append(f"Ignored: '{stmt}' (No matching habit found)")
            continue
            
        habit_id = best_habit.get("id")
        h_type = best_habit.get("type")
        h_name = best_habit.get("name")
        
        # Extract number if present
        numbers = re.findall(r'\d+(?:\.\d+)?', stmt)
        number_val = None
        if numbers:
            try:
                number_val = float(numbers[0])
                if number_val.is_integer():
                    number_val = int(number_val)
            except ValueError:
                pass
                
        if h_type == "checkbox":
            # If negative words exist, don't check
            negatives = ["no", "not", "skip", "fail", "unchecked", "uncheck"]
            if any(neg in stmt_lower for neg in negatives):
                # We can call log_habit to uncheck if it's already checked
                # But to avoid double toggle, we check if it is checked first.
                # Let's log it as checkbox log toggle
                res = log_habit(habit_id)
                results.append(f"Toggled checkbox '{h_name}': {res}")
            else:
                # We log habit
                res = log_habit(habit_id)
                results.append(f"Logged checkbox '{h_name}': {res}")
                
        elif h_type == "counter":
            val = number_val if number_val is not None else 1
            res = increment_habit(habit_id, val)
            results.append(f"Incremented counter '{h_name}' by {val}: {res}")
            
        elif h_type == "numeric":
            if number_val is not None:
                res = set_habit_value(habit_id, number_val)
                results.append(f"Set numeric '{h_name}' to {number_val}: {res}")
            else:
                results.append(f"Failed numeric '{h_name}': No value found in '{stmt}'")
                
        elif h_type in ("mood", "energy"):
            # Extract mood/energy word (e.g. "mood good" -> "good")
            # Try to grab whatever word isn't the keyword
            words = re.findall(r'\w+', stmt_lower)
            val_word = ""
            for w in words:
                if w not in h_name.lower() and w not in ("done", "logged", "set", "check", "checked"):
                    val_word = w
                    break
                    
            # Fallback to emoji check
            emojis = re.findall(r'[^\w\s,.]', stmt)
            if emojis:
                val_word = emojis[0]
                
            if val_word:
                res = set_habit_value(habit_id, val_word)
                results.append(f"Set {h_type} '{h_name}' to '{val_word}': {res}")
            else:
                results.append(f"Failed {h_type} '{h_name}': No value word/emoji found in '{stmt}'")
                
    return "\n".join(results)
