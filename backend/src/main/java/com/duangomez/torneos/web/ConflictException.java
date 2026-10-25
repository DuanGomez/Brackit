package com.duangomez.torneos.web;

import com.duangomez.torneos.web.Dtos.ConflictDto;

import java.util.List;

/** Reprogramar crearía choques: se devuelve un 409 con la lista para que la persona decida. */
public class ConflictException extends RuntimeException {

    private final List<ConflictDto> conflicts;

    public ConflictException(List<ConflictDto> conflicts) {
        super(conflicts.size() == 1 ? conflicts.get(0).message() : conflicts.size() + " choques en ese horario");
        this.conflicts = conflicts;
    }

    public List<ConflictDto> conflicts() {
        return conflicts;
    }
}
