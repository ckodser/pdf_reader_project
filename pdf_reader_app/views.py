from django.shortcuts import render
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import CachedAudio, PDFFile
import json


def index(request):
    """
    Renders the main page of the PDF reader application.
    This view will render the 'index.html' template.
    """
    return render(request, 'index.html')


@csrf_exempt
def get_cached_audio(request, file_hash):
    """
    Retrieves all cached audio entries for a given PDF file hash.
    This is called when a user uploads a PDF to pre-load any existing audio.
    """
    if request.method == 'GET':
        try:
            # Find the PDF file record using its hash
            pdf_file = PDFFile.objects.get(file_hash=file_hash)
            # Get all associated audio clips
            cached_audios = CachedAudio.objects.filter(pdf_file=pdf_file)

            cache_data = {}
            for audio in cached_audios:
                # Build a key that matches the client-side format: (sentence_hash)-(voice_model)
                cache_key = f"{audio.sentence_hash}-{audio.voice_model}"
                # The value is the URL to the stored audio file
                cache_data[cache_key] = audio.audio_file.url

            return JsonResponse(cache_data)
        except PDFFile.DoesNotExist:
            # If the file has never been seen before, return an empty cache
            return JsonResponse({})
    return HttpResponseBadRequest("Invalid request method")


@csrf_exempt
def cache_audio(request):
    """
    Receives and saves a new audio file to the cache from the client.
    Associates it with a PDF file, creating one if it doesn't exist.
    """
    if request.method == 'POST':
        try:
            file_hash = request.POST.get('file_hash')
            sentence_hash = request.POST.get('sentence_hash')
            voice_model = request.POST.get('voice_model')
            audio_file_blob = request.FILES.get('audio_file')

            # Basic validation
            if not all([file_hash, sentence_hash, voice_model, audio_file_blob]):
                return HttpResponseBadRequest("Missing required data in request")

            # Get the existing PDFFile record or create a new one
            pdf_file, _ = PDFFile.objects.get_or_create(file_hash=file_hash)

            # Create the new audio cache record.
            # The database's `unique_together` constraint will prevent duplicates.
            CachedAudio.objects.get_or_create(
                pdf_file=pdf_file,
                sentence_hash=sentence_hash,
                voice_model=voice_model,
                defaults={'audio_file': audio_file_blob}
            )

            return HttpResponse(status=201)  # 201 Created
        except Exception as e:
            return HttpResponseBadRequest(f"Error processing request: {e}")
    return HttpResponseBadRequest("Invalid request method")
