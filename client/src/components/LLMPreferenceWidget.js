import React from 'react';
import { updateLLMPreference } from '../services/api';

const LLMPreferenceWidget = ({ currentPreference, onPreferenceChange }) => {
  const handlePreferenceChange = async (event) => {
    const newPreference = event.target.value;
    try {
      await updateLLMPreference(newPreference);
      onPreferenceChange(newPreference);
    } catch (error) {
      console.error('Failed to update LLM preference:', error);
    }
  };

  return (
    <div className="llm-preference-widget">
      <h4>LLM Model</h4>
      <select 
        value={currentPreference} 
        onChange={handlePreferenceChange}
        className="llm-select"
      >
        <option value="gemini">Gemini</option>
      </select>
      <p>Using Gemini model for chat responses.</p>
    </div>
  );
};

export default LLMPreferenceWidget; 