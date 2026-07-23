package handler

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

const maxUploadSize = 5 << 20
const uploadDir = "./uploads"

var allowedMimeTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	os.MkdirAll(uploadDir, 0755)
	return &UploadHandler{}
}

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "file too large (max 5MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION", "no file provided")
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	if _, err := file.Read(buf); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to read file")
		return
	}
	file.Seek(0, io.SeekStart)

	mimeType := http.DetectContentType(buf)
	ext, ok := allowedMimeTypes[mimeType]
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION", fmt.Sprintf("invalid file type: %s (allowed: jpeg, png, webp)", mimeType))
		return
	}

	safeName := uuid.New().String() + ext
	destPath := filepath.Join(uploadDir, safeName)

	dst, err := os.Create(destPath)
	if err != nil {
		slog.Error("create upload file", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		slog.Error("copy upload file", "error", err)
		writeError(w, http.StatusInternalServerError, "INTERNAL", "failed to save file")
		return
	}

	url := "/uploads/" + safeName
	writeJSON(w, http.StatusCreated, map[string]string{
		"url":      url,
		"filename": header.Filename,
	})
}

func (h *UploadHandler) ServeUpload(w http.ResponseWriter, r *http.Request) {
	fileName := strings.TrimPrefix(r.URL.Path, "/uploads/")
	if fileName == "" || strings.Contains(fileName, "..") {
		writeError(w, http.StatusBadRequest, "VALIDATION", "invalid filename")
		return
	}

	filePath := filepath.Join(uploadDir, filepath.Base(fileName))
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "file not found")
		return
	}

	http.ServeFile(w, r, filePath)
}
