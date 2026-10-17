FROM python:3.12-slim
WORKDIR /srv
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir fastapi uvicorn pydantic
COPY backend backend
COPY contracts contracts
COPY mock-frontend mock-frontend
ENV HOST=0.0.0.0 PORT=8000 CONSENTSCOPE_DB=/srv/data/consentscope.db
EXPOSE 8000
CMD ["sh", "backend/run.sh"]
