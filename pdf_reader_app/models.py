from django.db import models
import os

def get_audio_upload_path(instance, filename):
    """
    Generates a unique path for each uploaded audio file to keep them organized.
    e.g., MEDIA_ROOT/audio_cache/file_hash/sentence_hash_voice_model.mp3
    """
    file_hash = instance.pdf_file.file_hash
    # Create a consistent filename based on the sentence and voice.
    safe_filename = f"{instance.sentence_hash}_{instance.voice_model}.mp3"
    return os.path.join('audio_cache', file_hash, safe_filename)

class PDFFile(models.Model):
    """Represents a unique PDF file, identified by its content hash."""
    file_hash = models.CharField(max_length=64, unique=True, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file_hash

class CachedAudio(models.Model):
    """Represents a single cached audio clip for a sentence in a specific voice."""
    pdf_file = models.ForeignKey(PDFFile, on_delete=models.CASCADE, related_name='audios')
    sentence_hash = models.CharField(max_length=64)
    voice_model = models.CharField(max_length=100)
    audio_file = models.FileField(upload_to=get_audio_upload_path)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # This constraint ensures we never save the same audio clip twice.
        unique_together = ('pdf_file', 'sentence_hash', 'voice_model')

    def __str__(self):
        return f"{self.pdf_file.file_hash[:10]}... - {self.sentence_hash}"
