package com.duangomez.torneos.service;

import java.util.Locale;

/**
 * Dibuja escudos de club en SVG a partir del color, el color secundario y la abreviatura del equipo.
 * Se usan cuando el equipo no ha subido la foto de su escudo.
 */
public final class CrestRenderer {

    public static final int STYLES = 6;

    private static final String SHIELD = "M50 4 L91 14 V46 C91 72 73 88 50 97 C27 88 9 72 9 46 V14 Z";
    private static final String FONT = "Inter,'SF Pro Display','Segoe UI',Roboto,Arial,sans-serif";

    private CrestRenderer() {
    }

    public static String svg(int style, String color, String color2, String label) {
        String c1 = valid(color) ? color : "#1F5BFF";
        String c2 = valid(color2) ? color2 : (isLight(c1) ? "#1D1D1F" : "#FFFFFF");
        String dark = shade(c1, 0.55);
        String text = escape(label == null || label.isBlank() ? "?" : label.trim().toUpperCase(Locale.ROOT));
        if (text.length() > 3) text = text.substring(0, 3);
        int size = text.length() > 2 ? 23 : 30;

        StringBuilder s = new StringBuilder(1400);
        s.append("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='200' height='200'>");
        s.append("<defs><clipPath id='c'><path d='").append(SHIELD).append("'/></clipPath></defs>");
        switch (Math.floorMod(style, STYLES)) {
            case 0 -> { // Clásico: jefe con estrella
                s.append(path(SHIELD, c1, dark, 3));
                s.append("<g clip-path='url(#c)'><rect x='0' y='0' width='100' height='31' fill='").append(c2).append("'/></g>");
                s.append(star(50, 18, 8, c1));
                s.append(path(SHIELD, "none", dark, 3));
                s.append(label(text, 50, 62, size, c2));
            }
            case 1 -> { // Rayas verticales con medallón
                s.append("<g clip-path='url(#c)'><rect width='100' height='100' fill='").append(c1).append("'/>");
                for (int x = 18; x < 100; x += 32) s.append("<rect x='").append(x).append("' y='0' width='16' height='100' fill='").append(c2).append("'/>");
                s.append("</g>");
                s.append(path(SHIELD, "none", dark, 3.5));
                s.append("<circle cx='50' cy='50' r='22' fill='").append(c1).append("' stroke='").append(c2).append("' stroke-width='3'/>");
                s.append(label(text, 50, 50, size - 4, c2));
            }
            case 2 -> { // Redondo con anillo
                s.append("<circle cx='50' cy='50' r='47' fill='").append(c2).append("' stroke='").append(dark).append("' stroke-width='2'/>");
                s.append("<circle cx='50' cy='50' r='40' fill='").append(c1).append("'/>");
                s.append("<circle cx='50' cy='50' r='31' fill='none' stroke='").append(c2).append("' stroke-width='1.5' stroke-dasharray='3 3'/>");
                s.append(star(17, 50, 4.5, c2)).append(star(83, 50, 4.5, c2));
                s.append(label(text, 50, 50, size, c2));
            }
            case 3 -> { // Partido en dos mitades
                s.append("<g clip-path='url(#c)'><rect width='50' height='100' fill='").append(c1).append("'/>");
                s.append("<rect x='50' width='50' height='100' fill='").append(c2).append("'/></g>");
                s.append(path(SHIELD, "none", dark, 3.5));
                s.append("<circle cx='50' cy='52' r='23' fill='#FFFFFF' stroke='").append(dark).append("' stroke-width='2.5'/>");
                s.append(label(text, 50, 52, size - 4, isLight(c1) ? "#1D1D1F" : c1));
            }
            case 4 -> { // Insignia hexagonal con chevrón
                String hex = "M50 3 L91 26 V74 L50 97 L9 74 V26 Z";
                String inner = "M50 11 L84 30 V70 L50 89 L16 70 V30 Z";
                s.append(path(hex, c1, dark, 2.5));
                s.append(path(inner, "none", c2, 2.5));
                s.append("<path d='M26 66 L50 80 L74 66' fill='none' stroke='").append(c2).append("' stroke-width='6' stroke-linejoin='round'/>");
                s.append(label(text, 50, 46, size, c2));
            }
            default -> { // Banda horizontal con estrella
                s.append(path(SHIELD, c1, dark, 3));
                s.append("<g clip-path='url(#c)'><rect x='0' y='40' width='100' height='26' fill='").append(c2).append("'/>");
                s.append("<rect x='0' y='76' width='100' height='4' fill='").append(c2).append("'/>");
                s.append("<rect x='0' y='84' width='100' height='4' fill='").append(c2).append("'/></g>");
                s.append(path(SHIELD, "none", dark, 3));
                s.append(star(50, 23, 9, c2));
                s.append(label(text, 50, 53, size - 6, c1));
            }
        }
        return s.append("</svg>").toString();
    }

    /** Color secundario sugerido para un color principal. */
    public static String secondaryFor(String color) {
        return isLight(color) ? "#1D1D1F" : "#FFFFFF";
    }

    public static boolean valid(String hex) {
        return hex != null && hex.matches("^#[0-9A-Fa-f]{6}$");
    }

    static boolean isLight(String hex) {
        if (!valid(hex)) return false;
        int n = Integer.parseInt(hex.substring(1), 16);
        int r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return 0.299 * r + 0.587 * g + 0.114 * b > 170;
    }

    private static String shade(String hex, double factor) {
        int n = Integer.parseInt(hex.substring(1), 16);
        int r = (int) (((n >> 16) & 255) * factor), g = (int) (((n >> 8) & 255) * factor), b = (int) ((n & 255) * factor);
        return String.format("#%02X%02X%02X", r, g, b);
    }

    private static String path(String d, String fill, String stroke, double width) {
        return "<path d='" + d + "' fill='" + fill + "' stroke='" + stroke + "' stroke-width='" + width + "' stroke-linejoin='round'/>";
    }

    private static String label(String text, int x, int y, int size, String fill) {
        return "<text x='" + x + "' y='" + y + "' dy='.35em' text-anchor='middle' font-family=\"" + FONT + "\" font-weight='800' font-size='"
                + size + "' letter-spacing='-0.5' fill='" + fill + "'>" + text + "</text>";
    }

    private static String star(double cx, double cy, double r, String fill) {
        StringBuilder p = new StringBuilder("<polygon fill='").append(fill).append("' points='");
        for (int i = 0; i < 10; i++) {
            double rad = i % 2 == 0 ? r : r * 0.42;
            double a = Math.PI / 5 * i - Math.PI / 2;
            p.append(String.format(Locale.ROOT, "%.2f,%.2f ", cx + rad * Math.cos(a), cy + rad * Math.sin(a)));
        }
        return p.append("'/>").toString();
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&apos;").replace("\"", "&quot;");
    }
}
