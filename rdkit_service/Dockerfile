FROM continuumio/miniconda3:24.1.2-0
WORKDIR /app
RUN conda install -c conda-forge rdkit flask pillow -y && conda clean --all -f -y
COPY app.py requirements.txt ./
EXPOSE 5000
CMD ["python", "app.py"]
