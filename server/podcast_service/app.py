import os
import uuid
import re
from flask import Flask, request, render_template, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import PyPDF2
import docx
import pyttsx3
from pydub import AudioSegment
import traceback

# --- Configuration ---
UPLOAD_FOLDER = os.path.join('static', 'uploads')
GENERATED_AUDIO_FOLDER = os.path.join('static', 'generated_audio')
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

# --- Flask App Initialization ---
app = Flask(__name__)
# Enable CORS for all routes
CORS(app, supports_credentials=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['GENERATED_AUDIO_FOLDER'] = GENERATED_AUDIO_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# --- Ensure directories exist ---
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_AUDIO_FOLDER, exist_ok=True)

# --- Helper Functions ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_txt(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()

def extract_text_from_pdf(filepath):
    text = ""
    try:
        with open(filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page_num in range(len(reader.pages)):
                page = reader.pages[page_num]
                text += page.extract_text() or "" # Add or "" to handle None
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return None
    return text

def extract_text_from_docx(filepath):
    try:
        doc = docx.Document(filepath)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        return None
    return text

def clean_text(text):
    # Remove excessive newlines and spaces
    text = re.sub(r'\n+', '\n', text).strip()
    text = re.sub(r'[ \t]+', ' ', text)
    # Remove or replace characters that TTS might struggle with (optional, can be expanded)
    text = text.replace("'", "'").replace("'", '"').replace("'", '"')
    return text

def split_text_into_chunks(text, max_chars_per_chunk=250):
    """Splits text into manageable chunks for TTS, trying to respect sentence boundaries."""
    sentences = re.split(r'(?<=[.!?])\s+', text) # Split by sentence-ending punctuation
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if not sentence.strip():
            continue
        if len(current_chunk) + len(sentence) + 1 < max_chars_per_chunk:
            current_chunk += (sentence + " ").strip()
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence.strip()
    if current_chunk: # Add the last chunk
        chunks.append(current_chunk.strip())
    
    # If any chunk is still too long (e.g., a very long sentence), split it further
    final_chunks = []
    for chunk in chunks:
        if len(chunk) > max_chars_per_chunk:
            # Simple split by space if sentence split wasn't enough
            words = chunk.split()
            temp_chunk = ""
            for i, word in enumerate(words):
                if len(temp_chunk) + len(word) + 1 < max_chars_per_chunk:
                    temp_chunk += word + " "
                else:
                    if temp_chunk:
                        final_chunks.append(temp_chunk.strip())
                    temp_chunk = word + " "
                if i == len(words) - 1 and temp_chunk: # last word of the oversized chunk
                     final_chunks.append(temp_chunk.strip())
        else:
            final_chunks.append(chunk)
    return final_chunks

def generate_conversational_script(text_chunks):
    script = []
    speakers = ["Alex", "Brenda"] # Let's name our speakers
    
    script.append({
        "speaker": speakers[0],
        "line": "Welcome everyone! Today, we're diving into an interesting document."
    })
    script.append({
        "speaker": speakers[1],
        "line": f"That's right, {speakers[0]}. Let's see what it's all about. What's the first part you have?"
    })

    for i, chunk in enumerate(text_chunks):
        speaker_idx = i % 2 # Alternate speakers
        current_speaker = speakers[speaker_idx]
        other_speaker = speakers[(speaker_idx + 1) % 2]

        script.append({"speaker": current_speaker, "line": chunk})
        
        # Add some interjections (very basic)
        if i < len(text_chunks) - 1:
            if (i + 1) % 4 == 0: # Every few chunks
                 script.append({
                    "speaker": other_speaker,
                    "line": f"Interesting point, {current_speaker}. What comes next?"
                })
            elif (i + 1) % 7 == 0:
                script.append({
                    "speaker": other_speaker,
                    "line": f"Thanks for sharing that, {current_speaker}. I'm curious about the following sections."
                })
    
    script.append({
        "speaker": speakers[len(text_chunks) % 2], # Last speaker of content
        "line": "And that seems to cover the main points from the document."
    })
    script.append({
        "speaker": speakers[(len(text_chunks) + 1) % 2],
        "line": f"Indeed, {speakers[len(text_chunks) % 2]}. A good overview. Thanks for joining us, listeners!"
    })
    return script

def create_podcast_audio(script, output_filename_base):
    """
    Generates audio for each line of the script using pyttsx3 and combines them.
    Returns the path to the final combined audio file.
    """
    try:
        # Ensure the output directory exists
        os.makedirs(app.config['GENERATED_AUDIO_FOLDER'], exist_ok=True)
        
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        
        # Attempt to select distinct voices
        voice_map = {}
        if len(voices) >= 2:
            voice_map["Alex"] = voices[0].id
            voice_map["Brenda"] = voices[1].id
        elif len(voices) == 1:
            print("Warning: Only one voice available. Both speakers will sound the same.")
            voice_map["Alex"] = voices[0].id
            voice_map["Brenda"] = voices[0].id
        else:
            print("Error: No TTS voices found!")
            return None

        # Set common properties
        engine.setProperty('rate', 160)  # Speed of speech

        temp_audio_files = []
        combined_audio = AudioSegment.empty()

        for i, part in enumerate(script):
            speaker = part["speaker"]
            line = part["line"]
            
            if not line.strip():  # Skip empty lines
                continue

            engine.setProperty('voice', voice_map[speaker])
            
            # Create temp file path
            temp_filename = os.path.join(app.config['GENERATED_AUDIO_FOLDER'], f"temp_{output_filename_base}_{i}.wav")
            
            print(f"Generating: {speaker}: {line[:50]}...")
            try:
                engine.save_to_file(line, temp_filename)
                engine.runAndWait()

                # Check if file was created and is not empty
                if os.path.exists(temp_filename) and os.path.getsize(temp_filename) > 0:
                    segment = AudioSegment.from_wav(temp_filename)
                    combined_audio += segment
                    temp_audio_files.append(temp_filename)
                else:
                    print(f"Warning: Failed to generate or empty audio for: {line[:50]}")
            except Exception as e:
                print(f"Error during TTS for '{line[:50]}...': {e}")
                continue

        if not temp_audio_files:
            print("No audio files were generated successfully")
            return None

        # Create the final output file path
        final_audio_path = os.path.join(app.config['GENERATED_AUDIO_FOLDER'], f"{output_filename_base}.wav")
        
        # Export the combined audio
        try:
            combined_audio.export(final_audio_path, format="wav")
            print(f"Successfully exported combined audio to: {final_audio_path}")
        except Exception as e:
            print(f"Error exporting combined audio: {e}")
            return None

        # Clean up temp files
        for temp_file in temp_audio_files:
            try:
                os.remove(temp_file)
            except Exception as e:
                print(f"Warning: Could not remove temp file {temp_file}: {e}")

        return final_audio_path

    except Exception as e:
        print(f"Error in create_podcast_audio: {e}")
        return None

# --- Flask Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_document():
    try:
        print("Received upload request")
        print("Files in request:", request.files)
        
        if 'file' not in request.files:
            print("No file part in request")
            return jsonify({'error': 'No file part in the request'}), 400
        
        file = request.files['file']
        if file.filename == '':
            print("No selected file")
            return jsonify({'error': 'No selected file'}), 400
        
        if not allowed_file(file.filename):
            print(f"File type not allowed: {file.filename}")
            return jsonify({'error': 'File type not allowed'}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        print(f"Saving file to: {filepath}")
        file.save(filepath)

        # Extract text based on file type
        text = None
        if filename.endswith('.txt'):
            text = extract_text_from_txt(filepath)
        elif filename.endswith('.pdf'):
            text = extract_text_from_pdf(filepath)
        elif filename.endswith('.docx'):
            text = extract_text_from_docx(filepath)

        if text is None:
            print("Failed to extract text from file")
            return jsonify({'error': 'Failed to extract text from file'}), 500

        # Clean and process the text
        text = clean_text(text)
        chunks = split_text_into_chunks(text)
        script = generate_conversational_script(chunks)

        # Generate audio
        output_filename_base = str(uuid.uuid4())
        audio_path = create_podcast_audio(script, output_filename_base)

        if audio_path is None:
            print("Failed to generate audio")
            return jsonify({'error': 'Failed to generate audio'}), 500

        # Return the audio URL
        audio_url = f'/generated_audio/{os.path.basename(audio_path)}'
        print(f"Successfully generated audio at: {audio_url}")
        return jsonify({'audio_url': audio_url}), 200

    except Exception as e:
        print(f"Error processing upload: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/generated_audio/<filename>')
def serve_audio(filename):
    try:
        return send_from_directory(app.config['GENERATED_AUDIO_FOLDER'], filename)
    except Exception as e:
        print(f"Error serving audio file {filename}: {e}")
        return jsonify({'error': 'Audio file not found'}), 404

# --- Main Execution ---
if __name__ == '__main__':
    # For development, debug=True is fine. For production, use a proper WSGI server.
    # host='0.0.0.0' makes it accessible on your network.
    app.run(host='0.0.0.0', port=5003, debug=True) 